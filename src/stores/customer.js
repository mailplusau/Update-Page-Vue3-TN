import { defineStore } from 'pinia';
import http from "@/utils/http.mjs";
import { useMainStore } from "@/stores/main";
import { useGlobalDialog } from "@/stores/global-dialog";
import {customer as customerDetails} from '@/utils/defaults.mjs';
import {useSalesRecordStore} from '@/stores/sales-record';

let globalDialog;

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

        if (mainStore.mode.value === mainStore.mode.options.NEW) return this.form.disabled = false;

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

            _processCustomerData(this, data)

            this.resetForm();
        } catch (e) { console.error(e); }

        this.form.disabled = true;
        globalDialog.close();
    },


    async setAsOutOfTerritory() {
        globalDialog.displayBusy('Process', 'Setting Customer As [Out of Territory]. Please Wait...')

        await http.post('setAsOutOfTerritory', {
            customerId: this.id,
            salesRecordId: useSalesRecordStore().id,
        });

        globalDialog.displayBusy('Complete', 'Customer Is Set As [Out of Territory]. Redirecting To Their Record Page. Please Wait...')

        useMainStore().goToCustomerRecord();
    },
    disableForm(disabled = true) {
        this.form.disabled = disabled;
    },
    resetForm() {
        this.form.data = {...this.details}
    }
};

function _updateFormTitleAndHeader(context) {
    let title, header;
    const mainStore = useMainStore();

    header = mainStore.mode.value === mainStore.mode.options.CALL_CENTER ? 'Call Center: ' : 'Finalise x Sale: ';

    header += context.details.entityid + ' ' + context.details.companyname;

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

    _updateFormTitleAndHeader(ctx);
}

export const useCustomerStore = defineStore('customer', {
    state: () => state,
    getters,
    actions,
});
