import { defineStore } from 'pinia';
import http from "@/utils/http.mjs";
import { useMainStore } from "@/stores/main";
import { useGlobalDialog } from "@/stores/global-dialog";
import {customer as customerDetails, franchisee as franchiseeDetails} from '@/utils/defaults.mjs';
import {useSalesRecordStore} from '@/stores/sales-record';
import {useAddressesStore} from '@/stores/addresses';
import {useUserStore} from '@/stores/user';
import {useContactStore} from '@/stores/contacts';
import {isoTestString, offsetDateObjectForNSDateField, readFileAsBase64} from '@/utils/utils.mjs';
import {useMiscStore} from '@/stores/misc';

let globalDialog;
const baseUrl = 'https://' + import.meta.env.VITE_NS_REALM + '.app.netsuite.com';

const state = {
    id: null,
    details: { ...customerDetails.basic, ...customerDetails.miscInfo, ...customerDetails.mpProducts,
        ...customerDetails.surveyInfo, ...customerDetails.lpoCampaign },
    texts: {},
    form: {
        data: {},
        busy: false,
        disabled: true,

        leadCaptureCampaign: null,
        salesRepToAssign: null,
    },

    photos: {
        data: [],
        busy: false,
    },
    invalidDataDialog: {
        open: false,
        busy: false,
        problems: [],
    }
};

state.form.data = {...state.details}
const dateFields = [
    'custentity_date_lead_entered',
    'custentity_lpo_date_last_sales_activity',
    'custentity_terms_conditions_agree_date',
    'custentity_mp_toll_zeevisit_memo',
    'custentity_portal_access_date'
];

const getters = {
    status : state => parseInt(state.details.entitystatus),
    isHotLead : state => parseInt(state.form.data.entitystatus) === 57,
    hasPortalAccess : state => parseInt(state.details.custentity_portal_access) === 1,
};

const actions = {
    async init() {
        globalDialog = useGlobalDialog();

        await Promise.allSettled([
            this.getPhotos(),
            this.getDetails(),
        ]);
    },
    async getPhotos() {
        if (!this.id) return;

        this.photos.busy = true;

        try {
            this.photos.data = await http.get('getPhotosOfBusiness', {
                customerId: this.id,
            });
        } catch (e) {console.log(e);}

        this.photos.busy = false;
    },
    async getDetails() {
        const mainStore = useMainStore();

        if (mainStore.mode.value === mainStore.mode.options.NEW) {
            this.restoreStateFromLocalStorage();
            this.form.disabled = false;
        } else if (this.id) {
            try {
                let fieldIds = [];
                for (let fieldId in this.details) fieldIds.push(fieldId);

                let data = await http.get('getCustomerDetails', {
                    customerId: this.id,
                    fieldIds,
                });

                _processCustomerData(this, data, fieldIds)

                this.resetForm();
                this.form.disabled = true;
            } catch (e) {console.error(e);}

            this.form.busy = false;
        }

        _updateFormTitleAndHeader(this);
    },
    validateNSData() { // to make sure that record doesn't contain inactive foreign keys
        if (!this.id) return;
        let problems = [];

        if (parseInt(this.form.data.partner) === 435 || !this.form.data.partner) { // if zee is MailPlus Pty Ltd (435), we force user to pick another zee
            this.form.data.partner = null;
            problems.push('partner');
        }

        let campaignIndex = useMiscStore().leadSources.findIndex(item => item.internalid === this.form.data.leadsource);
        if (campaignIndex >= 0 && useMiscStore().leadSources[campaignIndex]?.['isinactive']) {
            this.form.data.leadsource = null;
            problems.push('leadsource');
        }

        this.invalidDataDialog.open = !!problems.length;
        this.invalidDataDialog.problems = [...problems];
    },
    async handleOldCustomerIdChanged() {
        if (!this.form.data.custentity_old_customer) return;

        let data = await http.get('getFranchiseeOfCustomer', {
            customerId: this.form.data.custentity_old_customer,
            fieldIds: [...Object.keys(franchiseeDetails), 'id'],
        });

        this.form.data.custentity_old_zee = data['id'];
    },
    async changePortalAccess(notes, changeNotesOnly = false) {
        globalDialog.displayProgress('', 'Changing customer\'s Portal Access. Please wait...');

        await http.post('changePortalAccess', {
            customerId: this.id,
            portalAccess: changeNotesOnly ? null : (this.hasPortalAccess ? 2 : 1),
            changeNotes: notes,
            date: changeNotesOnly ? null : new Date()
        });

        await this.getDetails();

        if (changeNotesOnly) globalDialog.close(1000, 'Portal Access change note has been updated')
        else globalDialog.close(1000, 'Customer\'s Portal Access have been set to ' + (this.hasPortalAccess ? 'YES' : 'NO'))
    },
    async saveCustomer(fieldIds = [], lockUI = true) {
        if (lockUI) globalDialog.displayBusy('', 'Saving Customer\'s Details. Please Wait...')

        // Prepare data for submission
        let customerData = {};
        if (!fieldIds.length) for (let fieldId in this.details) fieldIds.push(fieldId);

        // If this is an NS Date field (which is different from NS DateTime field), we need to transform the ISO String
        // to have the local date and without timezone indicator (the 'Z' character at the end of the ISO string).
        // Then in SuiteScript, we just need to parse the string with a new Date() without further modification.
        for (let fieldId of fieldIds)
            customerData[fieldId] = dateFields.includes(fieldId) ? offsetDateObjectForNSDateField(this.form.data[fieldId]) : this.form.data[fieldId];

        try {
            let data = await http.post('saveCustomerDetails', {
                customerId: this.id,
                customerData,
                fieldIds,
            });

            _processCustomerData(this, data, fieldIds);

            this.resetForm();
        } catch (e) { console.error(e); }

        _updateFormTitleAndHeader(this);
        if (lockUI) globalDialog.close();
    },

    async saveBrandNewLead() {
        if (this.id) return;

        if (!useAddressesStore().data.length)
            return globalDialog.displayError('Missing Address', 'Please add at least 1 address for this lead');

        if (useUserStore().isFranchisee && this.isHotLead && !useContactStore().data.length)
            return globalDialog.displayError('Missing Contact', 'Please add at least 1 contact for this lead');

        globalDialog.displayBusy('', 'Saving new lead. Please wait...');

        // prepare data for submission
        let customerData = {};
        let addressArray = JSON.parse(JSON.stringify(useAddressesStore().data));
        let contactArray = JSON.parse(JSON.stringify(useContactStore().data));

        for (let fieldId of Object.keys(customerDetails.basic)) customerData[fieldId] = this.form.data[fieldId];

        for (let fieldId of ['email', 'custentity_email_service']) customerData[fieldId] = `${customerData[fieldId]}`.trim();

        customerData.custentity_mp_toll_salesrep = customerData.custentity_mp_toll_salesrep || this.form.salesRepToAssign;
        customerData.custentity_date_lead_entered = offsetDateObjectForNSDateField(new Date());
        delete customerData.entityid;

        if (useUserStore().isFranchisee) { // data preparation for when lead was entered by a zee
            customerData.partner = useUserStore().id;
            customerData.custentity_mp_toll_salesrep = useUserStore().salesRep.id; // Sales Rep ID
            customerData.leadsource = '-4'; // Franchisee Generated
            customerData.custentity_industry_category = '19'; // Others
            customerData.entitystatus = '6'; // SUSPECT-New
        }

        let customerId = await http.post('saveBrandNewCustomer', {customerData, addressArray, contactArray});

        await _uploadImages(this, customerId);

        globalDialog.displayBusy('', 'Cleaning up. Please wait...');

        this.clearStateFromLocalStorage();
        useAddressesStore().clearStateFromLocalStorage();
        useContactStore().clearStateFromLocalStorage();

        await http.rawGet(baseUrl + '/app/site/hosting/scriptlet.nl', {
            script: 1789,
            deploy: 1,
            custid: customerId,
            zeeid: customerData.partner,
            campaignid: this.form.leadCaptureCampaign,
            salesrepid: this.form.salesRepToAssign,
            role: useUserStore().role,
        }, {noErrorPopup: true});

        globalDialog.displayInfo(
            'Saving complete', 'A new lead has been created. What would you like to do?', true,
            [
                {color: 'green', variant: 'elevated', text: 'Enter Another Lead', action:() => { top.location.reload() }},
                'spacer',
                {color: 'green', variant: 'elevated', text: 'View new Lead\'s record', action: () => { this.goToRecordPage(customerId) }},
            ], 600)
    },

    async setAsOutOfTerritory() {
        globalDialog.displayBusy('', 'Setting Customer As [Out of Territory]. Please Wait...')

        await http.post('setAsOutOfTerritory', {
            customerId: this.id,
            salesRecordId: useSalesRecordStore().id,
        });

        globalDialog.displayBusy('', 'Customer Is Set As [Out of Territory]. Redirecting To Their Record Page. Please Wait...')

        this.goToRecordPage();
    },
    goToRecordPage(customerId = null) {
        globalDialog.displayBusy('', 'Navigating to Customer\'s Record page. Please wait...');
        top.location.href = baseUrl + '/app/common/entity/custjob.nl?id=' + (customerId || this.id);
    },
    disableForm(disabled = true) {
        this.form.disabled = disabled;
    },
    resetForm() {
        this.form.data = {...this.details}
    },

    validateData() {
        let unsavedChanges = [];

        if (!this.form.disabled) unsavedChanges.push('Customer\'s Details: Please save your changes');

        if (!this.form.data.custentity_mp_toll_salesrep) unsavedChanges.push('Customer\'s Details: [Account Manager] field is required');

        return unsavedChanges;
    },

    saveStateToLocalStorage() {
        if (!this.id) top.localStorage.setItem("1900_customer", JSON.stringify(this.form.data));
    },
    clearStateFromLocalStorage() {
        top.localStorage.removeItem("1900_customer");
        this.resetForm();
    },
    restoreStateFromLocalStorage() {
        if (this.id) return;

        try {
            const fieldIdsToExclude = ['leadsource']
            let data = JSON.parse(top.localStorage.getItem("1900_customer"));
            for (let fieldId in this.form.data)
                if (data[fieldId] && !fieldIdsToExclude.includes(fieldId)) this.form.data[fieldId] = data[fieldId];
        } catch (e) {
            console.log('No stored data found')
        }
    },
};

function _updateFormTitleAndHeader(ctx) {
    let title, header;
    const mainStore = useMainStore();

    header = (mainStore.mode.value === mainStore.mode.options.CALL_CENTER ? 'Call Center: ' : (mainStore.mode.value === mainStore.mode.options.UPDATE ? 'Update: ' : 'Finalise x Sale: '))
        + ctx.details.entityid + ' ' + ctx.details.companyname;

    if (!ctx.id) header = 'Lead/Prospect Capture Form';

    title = header + ' - NetSuite Australia (Mail Plus Pty Ltd)';

    mainStore.pageTitle = header.replace(ctx.details.entityid, '<a target="_blank" href="/app/common/entity/custjob.nl?id=' + ctx.id + '">' + ctx.details.entityid + '</a>');
    top.document.title = title;
}

function _processCustomerData(ctx, data, fieldIds) {
    for (let fieldId of fieldIds) {
        ctx.texts[fieldId] = data[fieldId + '_text'];
        ctx.details[fieldId] = isoTestString.test(data[fieldId]) ? new Date(data[fieldId]) : data[fieldId];
    }
}

async function _uploadImages(ctx, customerId) {
    try {
        if (ctx.photos.data.length && customerId) {
            globalDialog.displayBusy('', 'Uploading images. Please wait...');

            let epochTime = new Date().getTime();
            let dateStr = new Date().toISOString().split('T')[0].split('-').join('_');

            for (const [index, data] of ctx.photos.data.entries()) {
                let [, extension] = data.name.split('.');
                let base64FileContent = await readFileAsBase64(data);
                let fileName = `${dateStr}_${customerId}_${epochTime}_${index}.${extension}`;

                globalDialog.displayProgress(null, `Uploading files (${index + 1}/${this.photos.data.length}). Please wait...`,
                    Math.ceil(((index + 1) / this.photos.data.length * 100)), true);

                await http.post('uploadImage', {base64FileContent, fileName}, {noErrorPopup: true});
            }

            globalDialog.displayInfo('Complete', 'Files are saved.');
        }
    } catch (e) { console.error(e); }
}

export const useCustomerStore = defineStore('customer', {
    state: () => state,
    getters,
    actions,
});
