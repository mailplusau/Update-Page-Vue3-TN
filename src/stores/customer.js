import { defineStore } from 'pinia';
import http from "@/utils/http.mjs";
import { useMainStore } from "@/stores/main";
import { useGlobalDialog } from "@/stores/global-dialog";
import {customer as customerDetails} from '@/utils/defaults.mjs';
import {useSalesRecordStore} from '@/stores/sales-record';
import {useAddressesStore} from '@/stores/addresses';
import {useUserStore} from '@/stores/user';
import {useContactStore} from '@/stores/contacts';
import {getTodayDate, readFileAsBase64} from '@/utils/utils.mjs';

let globalDialog;
const baseUrl = 'https://' + import.meta.env.VITE_NS_REALM + '.app.netsuite.com';

const state = {
    id: null,
    details: { ...customerDetails },
    texts: {},
    form: {
        data: {},
        busy: false,
        disabled: true,
    },

    photos: {
        data: [],
        busy: false,
    },
    franchiseeSelector: {
        open: false,
        busy: false,
    },
};

state.form.data = {...state.details}

const getters = {
    isHotLead : state => state.id === null ? parseInt(state.form.data.entitystatus) === 57 : parseInt(state.details.entitystatus) === 57,
};

const actions = {
    async init() {
        globalDialog = useGlobalDialog();

        await Promise.allSettled([
            this.getPhotos(),
            this.getDetails(),
        ])
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

        if (mainStore.mode.value === mainStore.mode.options.NEW) this.form.disabled = false;
        else if (this.id) {
            try {
                let fieldIds = [];
                for (let fieldId in this.details) fieldIds.push(fieldId);

                let data = await http.get('getCustomerDetails', {
                    customerId: this.id,
                    fieldIds,
                });

                _processCustomerData(this, data)

                this.resetForm();
                this.form.disabled = true;
            } catch (e) {console.error(e);}

            this.form.busy = false;
        }

        _updateFormTitleAndHeader(this);
    },
    async handleOldCustomerIdChanged() {
        if (!this.form.data.custentity_old_customer) return;

        this.form.data.custentity_old_zee = await http.get('getFranchiseeOfCustomer', {
            customerId: this.form.data.custentity_old_customer,
        });
    },
    async changePortalAccess(notes, changeNotesOnly = false) {
        globalDialog.displayBusy('Processing', 'Changing customer\'s Portal Access. Please wait...');

        let hasPortalAccess = parseInt(this.form.data.custentity_portal_access) !== 2;

        await http.post('changePortalAccess', {
            customerId: this.id,
            portalAccess: changeNotesOnly ? null : (hasPortalAccess ? 2 : 1),
            changeNotes: notes,
            date: changeNotesOnly ? null : new Date()
        });

        await this.getDetails();

        if (changeNotesOnly) globalDialog.displayInfo('Complete', 'Portal Access change note has been updated')
        else globalDialog.displayInfo('Complete', 'Customer\'s Portal Access have been set to ' + (hasPortalAccess ? 'NO' : 'YES'))
    },
    async saveCustomer() {
        globalDialog.displayBusy('Saving Data', 'Saving Customer\'s Details. Please Wait...')

        // Prepare data for submission
        let fieldIds = [];
        for (let fieldId in this.details) fieldIds.push(fieldId);

        try {
            let data = await http.post('saveCustomerDetails', {
                customerId: this.id,
                customerData: {...this.form.data},
                fieldIds,
            });

            _processCustomerData(this, data);

            this.resetForm();
        } catch (e) { console.error(e); }

        this.form.disabled = true;
        _updateFormTitleAndHeader(this);
        globalDialog.close();
    },

    async saveBrandNewLead() {
        if (this.id) return;

        if (!useAddressesStore().data.length)
            return globalDialog.displayError('Missing Address', 'Please add at least 1 address for this lead');

        if (useUserStore().isFranchisee && this.isHotLead && !useContactStore().data.length)
            return globalDialog.displayError('Missing Contact', 'Please add at least 1 contact for this lead');

        globalDialog.displayBusy('Processing', 'Saving new lead. Please wait...');

        // prepare data for submission
        let customerData = {...this.form.data};
        let addressArray = JSON.parse(JSON.stringify(useAddressesStore().data));
        let contactArray = JSON.parse(JSON.stringify(useContactStore().data));

        customerData.custentity_date_lead_entered = getTodayDate();
        delete customerData.entityid;

        let customerId = await http.post('saveBrandNewCustomer', {customerData, addressArray, contactArray});

        await _uploadImages(this, customerId);

        globalDialog.displayBusy('Processing', 'Cleaning up. Please wait...');

        this.clearStateFromLocalStorage();
        useAddressesStore().clearStateFromLocalStorage();
        useContactStore().clearStateFromLocalStorage();

        await http.rawGet(baseUrl + '/app/site/hosting/scriptlet.nl', {
            script: 1789,
            deploy: 1,
            custid: customerId,
            role: useUserStore().role,
        }, {noErrorPopup: true});

        globalDialog.displayInfo(
            'Saving complete', 'A new lead has been created. What would you like to do?', true,
            [
                {color: 'green', variant: 'elevated', text: 'Enter Another Lead', action:() => { top.location.reload() }},
                {color: 'green', variant: 'elevated', text: 'View new Lead\'s record', action: () => { this.goToRecordPage(customerId) }},
            ])
    },

    async setAsOutOfTerritory() {
        globalDialog.displayBusy('Process', 'Setting Customer As [Out of Territory]. Please Wait...')

        await http.post('setAsOutOfTerritory', {
            customerId: this.id,
            salesRecordId: useSalesRecordStore().id,
        });

        globalDialog.displayBusy('Complete', 'Customer Is Set As [Out of Territory]. Redirecting To Their Record Page. Please Wait...')

        this.goToRecordPage();
    },
    goToRecordPage(customerId = null) {
        globalDialog.displayBusy('Processing', 'Navigating to Customer\'s Record page. Please wait...');
        top.location.href = baseUrl + '/app/common/entity/custjob.nl?id=' + (customerId || this.id);
    },
    disableForm(disabled = true) {
        this.form.disabled = disabled;
    },
    resetForm() {
        this.form.data = {...this.details}
    },

    saveStateToLocalStorage() {
        if (!this.id) top.localStorage.setItem("1900_customer", JSON.stringify(this.form.data));
    },
    clearStateFromLocalStorage() {
        top.localStorage.removeItem("1900_customer");
    },
    restoreStateFromLocalStorage() {
        if (this.id) return;

        try {
            let data = JSON.parse(top.localStorage.getItem("1900_customer"));
            for (let fieldId in this.form.data)
                if (data[fieldId]) this.form.data[fieldId] = data[fieldId];
        } catch (e) {
            console.log('No stored data found')
        }
    },
};

function _updateFormTitleAndHeader(ctx) {
    let title, header;
    const mainStore = useMainStore();

    header = (mainStore.mode.value === mainStore.mode.options.CALL_CENTER ? 'Call Center: ' : 'Finalise x Sale: ')
        + ctx.details.entityid + ' ' + ctx.details.companyname;

    if (!ctx.id) header = 'Lead Capture';

    title = header + ' - NetSuite Australia (Mail Plus Pty Ltd)';

    mainStore.pageTitle = header;
    top.document.title = title;
}

function _processCustomerData(ctx, data) {
    for (let fieldId in ctx.details) {
        if (fieldId === 'partner' && parseInt(data[fieldId]) === 435) { // if zee is MailPlus Pty Ltd (435), we force user to pick another zee
            ctx.details[fieldId] = null;
            ctx.texts[fieldId] = '';
            continue;
        }
        ctx.details[fieldId] = data[fieldId];
        ctx.texts[fieldId] = data[fieldId + '_text'];
    }

    ctx.franchiseeSelector.open = !ctx.details.partner;
}

async function _uploadImages(ctx, customerId) {
    try {
        if (ctx.photos.data.length && customerId) {
            globalDialog.displayBusy('Processing', 'Uploading images. Please wait...');

            let epochTime = new Date().getTime();
            let dateStr = new Date().toISOString().split('T')[0].split('-').join('_');

            for (const [index, data] of ctx.photos.data.entries()) {
                let [, extension] = data.name.split('.');
                let base64FileContent = await readFileAsBase64(data);
                let fileName = `${dateStr}_${customerId}_${epochTime}_${index}.${extension}`;

                globalDialog.displayBusy(
                    null, `Uploading files (${index + 1}/${this.photos.data.length}). Please wait...`,
                    true, Math.ceil(((index + 1) / this.photos.data.length * 100)));

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
