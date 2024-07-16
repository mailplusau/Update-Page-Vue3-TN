import { defineStore } from 'pinia';
import { contact as contactDefaults } from '@/utils/defaults.mjs';
import {useCustomerStore} from '@/stores/customer';
import http from '@/utils/http.mjs';
import {testContacts} from '@/utils/testData';
import {useGlobalDialog} from '@/stores/global-dialog';

const state = {
    data: [],
    busy: false,

    dialog: {
        title: '',
        open: false,
        form: { ...contactDefaults },
        busy: false,
        disabled: false,
    },
};

const getters = {
    hasRoleWithPortalAdminAccess : state => {
        for (let contact of state.data)
            if (parseInt(contact.custentity_connect_admin) === 1) return true;

        return false;
    }
};

const actions = {
    async init() {
        await _fetchContacts(this);

        _resetContactForm(this);
    },
    async openDialog(open = true, contactId = null) {
        this.dialog.open = open;

        if (open) {
            let index = this.data.findIndex(item => item.internalid === contactId);
            this.dialog.busy = true;
            this.dialog.title = index >= 0 ? `Edit Contact Id #${contactId}` : 'Add Contact';

            if (index >= 0) // Index exists, edit mode
                this.dialog.form = {...this.data[index]};
            else {
                this.dialog.form = {...this.contact};
                if (!this.data.length) // If there are no existing contact, set as Primary Contact (-10)
                    this.dialog.form.contactrole = '-10';
            }

            this.dialog.busy = false;
        }
    },
    async saveContact() {
        useGlobalDialog().displayBusy('Processing', `Saving contact. Please wait...`);
        this.dialog.busy = true;
        this.dialog.form.entityid = this.dialog.form.firstname + ' ' + this.dialog.form.lastname;

        if (useCustomerStore().id) {
            try {
                this.dialog.form.company = useCustomerStore().id;

                await http.post('saveContact', {
                    contactData: this.dialog.form,
                });

                await _fetchContacts(this);
            } catch (e) { console.error(e); }
        }

        this.dialog.busy = false;
        this.dialog.open = false;
        useGlobalDialog().close();
    },
    async removeContact(contactId) {
        useGlobalDialog().displayBusy('Processing', `Removing contact ID #${contactId}. Please wait...`);

        try {
            await http.post('setContactAsInactive', {
                contactInternalId: contactId,
            });

            await _fetchContacts(this);
        } catch (e) { console.error(e); }

        useGlobalDialog().close();
    },
    async resendCreatePortalPasswordEmail(contactId) {
        useGlobalDialog().displayBusy('Processing', `Resending Create Portal Password Email for contact ID #${contactId}. Please wait...`);

        await http.post('resendCreatePortalPasswordEmail', {
            customerId: useCustomerStore().id, contactId
        });

        await _fetchContacts(this);

        useGlobalDialog().displayInfo('Complete', 'The Create Portal Password email will be sent out shortly.');
    }
};

async function _fetchContacts(ctx) {
    ctx.data = [...testContacts]
    if (!useCustomerStore().id) return;
    ctx.busy = true;

    let data = await http.get('getCustomerContacts', {
        customerId: useCustomerStore().id
    });

    if (!Array.isArray(data)) return;

    await Promise.allSettled(data.map(async contact => {
        let {accountActivated, createPasswordEmailSent} = await http.get('checkPortalStatusOfContactEmail', {contactId: contact.internalid});
        contact.accountActivated = accountActivated;
        contact.createPasswordEmailSent = createPasswordEmailSent;
    }));

    ctx.data = [...data];
    ctx.busy = false;
}

function _resetContactForm(ctx) {
    ctx.dialog.form = { ...contactDefaults };
    ctx.dialog.form.company = useCustomerStore().id || null;
    ctx.dialog.form.internalid = null;
}

export const useContactStore = defineStore('contacts', {
    state: () => state,
    getters,
    actions,
});
