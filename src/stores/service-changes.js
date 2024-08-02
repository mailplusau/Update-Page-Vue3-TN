import { defineStore } from 'pinia';
import http from '@/utils/http.mjs';
import {useCustomerStore} from '@/stores/customer';
import {useCRStore} from '@/stores/comm-reg';

const state = {
    data: [],
    busy: true,
};

const getters = {

};

const actions = {
    async init() {
        await this.fetchData();

        this.busy = false;
    },
    async fetchData() {
        if (!useCustomerStore().id || !useCRStore().id) return;

        try {
            let data = await http.get('getServiceChanges', {
                customerId: useCustomerStore().id,
                commRegId: useCRStore().id
            });

            this.data = [...data]
        } catch (e) { console.error(e); }
    }
};


export const useServiceChangesStore = defineStore('service-changes', {
    state: () => state,
    getters,
    actions,
});
