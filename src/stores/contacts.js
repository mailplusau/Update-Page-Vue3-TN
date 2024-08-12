import {defineStore} from 'pinia';
import {contact as contactDefaults} from '@/utils/defaults.mjs';
import {useCustomerStore} from '@/stores/customer';
import http from '@/utils/http.mjs';
import {useGlobalDialog} from '@/stores/global-dialog';

let localId = 1;

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
        useGlobalDialog().displayBusy('', `Saving contact. Please wait...`);
        this.dialog.form.entityid = this.dialog.form.firstname + ' ' + this.dialog.form.lastname;
        this.dialog.form.company = useCustomerStore().id || '';
        this.dialog.form.email = `${this.dialog.form.email}`.trim();

        if (useCustomerStore().id) await _saveContact.toNetSuite(this);
        else await _saveContact.toLocal(this);

        await updatePortalAccessBasedOnContacts(this);

        this.dialog.open = false;
        useGlobalDialog().close().then();
    },
    async removeContact(contactId) {
        useGlobalDialog().displayBusy('', `Removing contact ID #${contactId}. Please wait...`);

        if (useCustomerStore().id) {
            try {
                await http.post('setContactAsInactive', {contactInternalId: contactId});
                await _fetchContacts(this);
            } catch (e) { console.error(e); }
        } else {
            let index = this.data.findIndex(item => item.internalid === contactId);
            if (index >= 0) this.data.splice(index, 1);
            this.saveStateToLocalStorage();
        }

        useGlobalDialog().close().then();
    },
    async resendCreatePortalPasswordEmail(contactId) {
        useGlobalDialog().displayBusy('', `Resending Create Portal Password Email for contact ID #${contactId}. Please wait...`);

        await http.post('resendCreatePortalPasswordEmail', {
            customerId: useCustomerStore().id, contactId
        });

        await _fetchContacts(this);

        useGlobalDialog().displayInfo('Complete', 'The Create Portal Password email will be sent out shortly.');
    },
    async sendTncReminder(contact) {
        useGlobalDialog().displayBusy('', `Sending T&C Reminder to contact ID #${contact.internalid}. Please wait...`);

        let res = await http.post('sendTncSmsToContact', {
            customerId: useCustomerStore().id, phoneNumber: contact.phone
        });

        useGlobalDialog().displayInfo('Complete', res);
    },

    saveStateToLocalStorage() {
        if (useCustomerStore().id) return;
        top.localStorage.setItem("1900_contacts", JSON.stringify(this.data));
    },
    clearStateFromLocalStorage() {
        top.localStorage.removeItem("1900_contacts");
    },
    restoreStateFromLocalStorage() {
        if (useCustomerStore().id) return;

        try {
            let data = JSON.parse(top.localStorage.getItem("1900_contacts"));
            if (Array.isArray(data)) this.data = [...data];
            updatePortalAccessBasedOnContacts(this).then();
        } catch (e) {
            console.log('No stored data found')
        }
    }
};

async function _fetchContacts(ctx) {
    // ctx.data = [...testContacts]
    if (!useCustomerStore().id) return ctx.restoreStateFromLocalStorage();
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

const _saveContact = {
    async toNetSuite(ctx) {
        try {
            await http.post('saveContact', {
                customerId: useCustomerStore().id,
                contactData: ctx.dialog.form,
            });

            await _fetchContacts(ctx);
        } catch (e) { console.error(e); }
    },
    async toLocal(ctx) {
        ctx.dialog.form.email = ctx.dialog.form.email || 'abc@abc.com';

        if (ctx.dialog.form.internalid !== null && ctx.dialog.form.internalid >= 0) {
            let currentIndex = ctx.data.findIndex(item => item.internalid === ctx.dialog.form.internalid);
            ctx.data.splice(currentIndex, 1, {...ctx.dialog.form});
        } else ctx.data.push({...ctx.dialog.form, internalid: localId++});

        _resetContactForm(ctx);

        ctx.saveStateToLocalStorage();
    }
}

async function updatePortalAccessBasedOnContacts(ctx) {
    if (useCustomerStore().status === 13) return;

    let contactsWithPortalAccess = ctx.data // Portal User or Admin is set to Yes (1)
        .filter(item => parseInt(item.custentity_connect_user) === 1 || parseInt(item.custentity_connect_admin) === 1);

    useCustomerStore().form.data.custentity_portal_access = contactsWithPortalAccess.length ? 1 : 2;  // Yes (1) | No (2)
    useCustomerStore().form.data.custentity_portal_access_date = contactsWithPortalAccess.length ? new Date() : '';

    if (useCustomerStore().id && parseInt(useCustomerStore().form.data.custentity_portal_access) !== parseInt(useCustomerStore().details.custentity_portal_access))
        await useCustomerStore().saveCustomer(['custentity_portal_access', 'custentity_portal_access_date'], false);
}

export const useContactStore = defineStore('contacts', {
    state: () => state,
    getters,
    actions,
});
