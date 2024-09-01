import { defineStore } from 'pinia';
import {COMM_REG_STATUS, commReg as commRegFields} from '@/utils/defaults.mjs';
import http from '@/utils/http.mjs';
import {useCustomerStore} from '@/stores/customer';
import {useSalesRecordStore} from '@/stores/sales-record';
import {isoTestString, offsetDateObjectForNSDateField, readFileAsBase64, waitMilliseconds} from '@/utils/utils.mjs';
import {useGlobalDialog} from '@/stores/global-dialog';
import {useUserStore} from '@/stores/user';
import {useFranchiseeStore} from '@/stores/franchisee';

const dateFields = ['custrecord_comm_date', 'custrecord_date_entry', 'custrecord_comm_date_signup', 'custrecord_finalised_on'];

const state = {
    id: null,
    details: {...commRegFields},
    texts: {},
    busy: false,

    form: {
        data: {...commRegFields},
        busy: false,
        disabled: false,
        customerDisplayName: '',

        attachedFile: null,
        attachedFilePreview: null,
    }
};

const getters = {
    outdatedCommencementDate : state => {
        if (!state.details.custrecord_comm_date) return true;

        let today = new Date();
        today.setHours(0, 0, 0);

        return state.details.custrecord_comm_date <= today;
    }
};

const actions = {
    async init() {
        if (!useCustomerStore().id || !useSalesRecordStore().id) return;

        this.form.disabled = true;
        await _getCommencementRegister(this);
        this.resetForm();
        this.form.disabled = false;
    },
    resetForm() {
        this.form.data = {...this.details}
    },
    async generatePreviewUrl() {
        this.form.attachedFilePreview = null;

        if (this.form.attachedFile)
            this.form.attachedFilePreview = URL.createObjectURL(this.form.attachedFile)
        else if (this.details.custrecord_scand_form) {
            try {
                let {fileURL} = await http.get('getFileURLById', {
                    fileId: this.details.custrecord_scand_form
                });
                this.form.attachedFilePreview = fileURL;
            } catch (e) { console.error(e); }
        }
    },

    async finalise() {
        if (!await finalisationProcess.confirmTncAgreement(this)) return;

        useGlobalDialog().displayProgress('', 'Saving Commencement Register...', 0, false, 550);
        await finalisationProcess.saveCommReg(this);

        useGlobalDialog().displayProgress('', 'Modifying Sales Record...', 5, false, 550);
        await finalisationProcess.updateSalesRecord(this);

        useGlobalDialog().displayProgress('', 'Modifying Customer Record...', 20, false, 550);
        await finalisationProcess.updateCustomerRecord(this);

        if (parseInt(useCustomerStore().details.entitystatus) === 66 && !useUserStore().isMe) { // status going from To Be Finalised (66) to Signed (13)
            useGlobalDialog().displayProgress('', 'Notifying Franchisee of newly signed Customer...', 35, false, 550);
            await http.post('finalisation.notifyFranchiseeOfNewCustomer', {
                customerId: useCustomerStore().id, franchiseeId: useFranchiseeStore().id, commRegId: useCRStore().id});
        }

        if (!useUserStore().isMe) {
            useGlobalDialog().displayProgress('', 'Initiating portal account and notifying Data Admins...', 55, false, 550);
            await http.post('finalisation.activatePortalAndNotifyAdmin', {
                customerId: useCustomerStore().id, franchiseeId: useFranchiseeStore().id, commRegId: useCRStore().id});
        }

        if (useCustomerStore().hasPortalAccess && !useUserStore().isMe) { // sync product pricing only when customer has portal access
            useGlobalDialog().displayProgress('', 'Synchronising product pricing...', 70, false, 550);
            await http.post('finalisation.checkAndSyncProductPricing', {
                customerId: useCustomerStore().id, franchiseeId: useFranchiseeStore().id, commRegId: useCRStore().id});
        }

        if (![71].includes(useCustomerStore().status)) {
            useGlobalDialog().displayProgress('', 'Synchronising product pricing...', 80, false, 550);
            let customerData = {'entitystatus': 13}; // Set status as Signed (13)
            await http.post('saveCustomerDetails', {customerId: useCustomerStore().id, customerData, fieldIds: []});
        }

        if (!useUserStore().isMe && [COMM_REG_STATUS.Signed].includes(this.details.custrecord_trial_status)) {
            useGlobalDialog().displayProgress('', 'Finishing up finalisation process...', 90, false, 550);
            await http.post('finalisation.updateFinancialItemsAndLaunchScheduledScript', {
                customerId: useCustomerStore().id, franchiseeId: useFranchiseeStore().id, commRegId: useCRStore().id
            });
        }

        useGlobalDialog().displayProgress('', 'Finalisation Process Completed.', 100, false, 550);
        await waitMilliseconds(2000);

        useCustomerStore().goToRecordPage();
    }
};

const finalisationProcess = {
    async confirmTncAgreement(ctx) {
        if (ctx.form.data.custrecord_tnc_agreement_date) return true;

        const msg = `<b class="text-primary">T&C Agreement Date</b> is not set. `
            + `<b class="text-primary">Commencement Register</b> will be <b class="text-red">Awaiting T&C's to be Accepted</b>. `
            + `Would you like to proceed?`;

        let res = await new Promise(resolve => {
            useGlobalDialog().displayInfo('T&C Agreement', msg, true, [
                'spacer',
                {color: 'red', variant: 'outlined', text: 'Cancel', action:() => { resolve(0) }},
                {color: 'green', variant: 'elevated', text: 'Proceed with finalisation', action:() => { resolve(1) }},
                'spacer',
            ], 550)
        });

        useGlobalDialog().close().then();

        return !!res;
    },
    async saveCommReg(ctx) {
        let commRegData = {};
        const fieldIds = Object.keys(commRegFields);
        const dateStr = (new Date()).toISOString().split('T')[0];
        const entityId = useCustomerStore().details.entityid;

        // Data preparation
        ctx.form.data['custrecord_salesrep'] = ctx.form.data['custrecord_salesrep'] || useSalesRecordStore().details.custrecord_sales_assigned || useUserStore().id;
        ctx.form.data['custrecord_finalised_on'] = new Date();
        ctx.form.data['custrecord_finalised_by'] = ctx.form.data['custrecord_finalised_by'] || useUserStore().id;
        ctx.form.data['custrecord_customer'] = ctx.form.data['custrecord_customer'] || useCustomerStore().id;
        ctx.form.data['custrecord_franchisee'] = ctx.form.data['custrecord_franchisee'] || useFranchiseeStore().id;
        ctx.form.data['custrecord_commreg_sales_record'] = ctx.form.data['custrecord_commreg_sales_record'] || useSalesRecordStore().id;
        ctx.form.data['custrecord_state'] = ctx.form.data['custrecord_state'] || useFranchiseeStore().details.location;

        if (![9, 2].includes(parseInt(ctx.form.data['custrecord_trial_status']))) // do this only if status is not already Signed (2) or Scheduled (9)
            ctx.form.data['custrecord_trial_status'] = ctx.form.data['custrecord_tnc_agreement_date'] ?
                '9' : (ctx.form.data['custrecord_trial_status'] || '11'); // Scheduled (9), Waiting T&C (11)

        for (let fieldId of fieldIds)
            commRegData[fieldId] = dateFields.includes(fieldId) ? offsetDateObjectForNSDateField(ctx.form.data[fieldId]) : ctx.form.data[fieldId];

        const fileContent = await readFileAsBase64(ctx.form.attachedFile);

        const {commRegId} = await http.post('saveOrCreateCommencementRegister', {
            commRegId: ctx.id, commRegData, fileContent, fileName: `${dateStr}_${entityId}.pdf`
        });

        ctx.id = commRegId;
    },
    async updateSalesRecord(ctx) {
        let salesRecordData = {
            custrecord_sales_outcome: 2,
            custrecord_sales_completed: true,
            custrecord_sales_inuse: false,
            custrecord_sales_commreg: ctx.id,
            custrecord_sales_completedate: offsetDateObjectForNSDateField(new Date()),
        };

        await http.post('saveOrCreateSalesRecord', {salesRecordId: useSalesRecordStore().id, salesRecordData});
    },
    async updateCustomerRecord(ctx) {
        let customerData = {
            custentity_date_prospect_opportunity: useCustomerStore().details.custentity_date_prospect_opportunity || offsetDateObjectForNSDateField(new Date()),
            custentity_cust_closed_won: true,
            custentity_mpex_surcharge: 1,
            custentity_display_name: ctx.form.customerDisplayName,
        };

        // if T&C Agreement Date is not set on customer level and a date is selected by Data Admin
        if (!useCustomerStore().details.custentity_terms_conditions_agree_date && ctx.form.data.custrecord_tnc_agreement_date) {
            customerData.custentity_terms_conditions_agree_date = offsetDateObjectForNSDateField(ctx.form.data.custrecord_tnc_agreement_date);
            customerData.custentity_terms_conditions_agree = '1'; // 1: yes, 2: no
        }

        // check if this customer has service fuel surcharge set to anything other than No (2) and Not Included (3)
        if (![2, 3].includes(parseInt(useCustomerStore().details.custentity_service_fuel_surcharge))) {
            customerData['custentity_service_fuel_surcharge'] = 1;
            if ([218, 469].includes(parseInt(useCustomerStore().details.partner)))customerData['custentity_service_fuel_surcharge_percen'] = '5.3';
        } else if ([2].includes(parseInt(useCustomerStore().details.custentity_service_fuel_surcharge)))
            customerData['custentity_service_fuel_surcharge_percen'] = null;

        // Activate MP Standard based on the associated Franchisee
        if (parseInt(useFranchiseeStore().details.custentity_zee_mp_std_activated) === 1)
            customerData['custentity_mp_std_activate'] = 1; // Activate MP Standard Pricing

        await http.post('saveCustomerDetails', {customerId: useCustomerStore().id, customerData, fieldIds: []});
    }
}

async function _getCommencementRegister(ctx) {
    if (!useCustomerStore().id || !useSalesRecordStore().id) return;

    if (!ctx.id) { // query and verify that there's a workable Commencement Register associated with the Sales Record
        const commRegs = await http.get('getCommRegBySalesRecordId', { salesRecordId: useSalesRecordStore().id });
        const validStatuses = [COMM_REG_STATUS.Quote, COMM_REG_STATUS.Waiting_TNC, COMM_REG_STATUS.Scheduled, COMM_REG_STATUS.Signed];

        if (commRegs.length > 1)
            return useGlobalDialog().displayError('Error',
                `There are more than one Commencement Registers associated with Sales Record #${useSalesRecordStore().id}.`, 450, [
                    'spacer', {color: 'red', variant: 'elevated', text: 'Back to customer\'s record', action:() => { useCustomerStore().goToRecordPage() }}, 'spacer',
                ]);

        if (commRegs.length === 1 && validStatuses.includes(parseInt(commRegs[0]['custrecord_trial_status'])))
            ctx.id = commRegs[0]['internalid'];
        else if (commRegs.length === 1)
            return useGlobalDialog().displayError('Error',
                `This Commencement Register is neither Signed, Quote, Scheduled nor Awaiting T&C Agreement.`, 450, [
                    'spacer', {color: 'red', variant: 'elevated', text: 'Back to customer\'s record', action:() => { useCustomerStore().goToRecordPage() }}, 'spacer',
                ]);
    }

    if (!ctx.id) return ctx.loading = false;

    let data = await http.get('getCommencementRegister', { commRegId: ctx.id });

    for (let fieldId in ctx.details) {
        ctx.details[fieldId] = isoTestString.test(data[fieldId]) ? new Date(data[fieldId]) : data[fieldId];
        ctx.texts[fieldId] = data[fieldId + '_text'];
    }
}

export const useCRStore = defineStore('commencement-register', {
    state: () => state,
    getters,
    actions,
});
