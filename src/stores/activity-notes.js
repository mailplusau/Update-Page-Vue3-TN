import { defineStore } from 'pinia';
import http from '@/utils/http.mjs';
import {userNote as userNoteFields} from '@/utils/defaults.mjs';
import {useCustomerStore} from '@/stores/customer';
import {useGlobalDialog} from '@/stores/global-dialog';
import {useUserStore} from '@/stores/user';

const state = {
    userNotes: {
        data: [],
        form: {...userNoteFields},
        crudDialogOpen: false,
        busy: false,
    },
    salesActivities: {
        data: [],
        busy: false,
    }
};

const getters = {

};

const actions = {
    async init() {
        await Promise.allSettled([
            this.getUserNotes(),
            this.getSalesActivities(),
        ])
    },
    async getUserNotes() {
        if (!useCustomerStore().id) return;

        this.userNotes.busy = true;
        this.userNotes.data = await http.get('getCustomersUserNotes', {customerId: useCustomerStore().id});
        this.userNotes.busy = false;
    },
    async getSalesActivities() {
        if (!useCustomerStore().id) return;

        this.salesActivities.busy = true;
        this.salesActivities.data = await http.get('getCustomersActivities', {customerId: useCustomerStore().id});
        this.salesActivities.busy = false;
    },
    openUserNoteDialog() {
        this.userNotes.form = {...userNoteFields, author: `${useUserStore().id}`};
        this.userNotes.crudDialogOpen = true;
    },
    async saveUserNote() {
        this.userNotes.crudDialogOpen = false;
        useGlobalDialog().displayBusy('', 'Saving user note. Please wait...');

        let res = await http.post('createUserNote', {
            customerId: useCustomerStore().id,
            ...this.userNotes.form
        })

        console.log('saveUserNote', res);
        await this.getUserNotes();
        useGlobalDialog().close().then();
        this.userNotes.form = {...userNoteFields};
    }
};


export const useActivityNotesStore = defineStore('activity-notes', {
    state: () => state,
    getters,
    actions,
});
