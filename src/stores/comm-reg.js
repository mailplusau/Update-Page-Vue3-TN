import { defineStore } from 'pinia';
import {commReg as commRegFields} from '@/utils/defaults.mjs';
import http from '@/utils/http.mjs';
import {useCustomerStore} from '@/stores/customer';
import {useSalesRecordStore} from '@/stores/sales-record';
import {offsetDateObjectForNSDateField, readFileAsBase64, waitMilliseconds} from '@/utils/utils.mjs';
import {useGlobalDialog} from '@/stores/global-dialog';
import {useUserStore} from '@/stores/user';
import {useFranchiseeStore} from '@/stores/franchisee';

const isoStringRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;
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
        let data = await http.get('getCommencementRegister', {customerId: useCustomerStore().id, salesRecordId: useSalesRecordStore().id});

        if (!data['internalid']) return this.form.disabled = false;

        this.id = data['internalid'];

        for (let fieldId in commRegFields)
            this.details[fieldId] = isoStringRegex.test(data[fieldId]) ? new Date(data[fieldId]) : data[fieldId]; // there could be multiple comm regs, we take only the first result

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
        useGlobalDialog().displayProgress('', 'Saving Commencement Register. Please wait...', 0);
        await finalisationProcess.saveCommReg(this);

        useGlobalDialog().displayProgress('', 'Modifying Sales Record. Please wait...', 5);
        await finalisationProcess.updateSalesRecord(this);

        useGlobalDialog().displayProgress('', 'Modifying Customer Record. Please wait...', 20);
        await finalisationProcess.updateCustomerRecord(this);

        if (parseInt(useCustomerStore().details.entitystatus) === 66) { // status going from To Be Finalised (66) to Signed (13)
            useGlobalDialog().displayProgress('', 'Notifying Franchisee of newly signed Customer. Please wait...', 35);
            await http.post('finalisation.notifyFranchiseeOfNewCustomer', {
                customerId: useCustomerStore().id, franchiseeId: useFranchiseeStore().id, commRegId: useCRStore().id});
        }

        useGlobalDialog().displayProgress('', 'Initiating portal account and notifying Data Admins. Please wait...', 55);
        await http.post('finalisation.activatePortalAndNotifyAdmin', {
            customerId: useCustomerStore().id, franchiseeId: useFranchiseeStore().id, commRegId: useCRStore().id});

        useGlobalDialog().displayProgress('', 'Synchronising product pricing. Please wait...', 70);
        await http.post('finalisation.checkAndSyncProductPricing', {
            customerId: useCustomerStore().id, franchiseeId: useFranchiseeStore().id, commRegId: useCRStore().id});

        useGlobalDialog().displayProgress('', 'Finishing up finalisation process. Please wait...', 90);
        await http.post('finalisation.updateFinancialItemsAndLaunchScheduledScript', {
            customerId: useCustomerStore().id, franchiseeId: useFranchiseeStore().id, commRegId: useCRStore().id});

        useGlobalDialog().displayProgress('', 'Finalisation Process Completed.', 100);
        await waitMilliseconds(2000);

        useGlobalDialog().displayProgress('', 'Redirecting to NetSuite Record Page of customer...', 100);
        useCustomerStore().goToRecordPage();
    }
};

const finalisationProcess = {
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
            custentity_date_prospect_opportunity: offsetDateObjectForNSDateField(new Date()),
            custentity_cust_closed_won: true,
            custentity_mpex_surcharge: 1,
            custentity_display_name: ctx.form.customerDisplayName,
        };

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


export const useCRStore = defineStore('commencement-register', {
    state: () => state,
    getters,
    actions,
});
