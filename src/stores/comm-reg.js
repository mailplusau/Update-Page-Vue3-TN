import { defineStore } from 'pinia';
import {commReg as commRegFields} from '@/utils/defaults.mjs';
import http from '@/utils/http.mjs';
import {useCustomerStore} from '@/stores/customer';
import {useSalesRecordStore} from '@/stores/sales-record';

const state = {
    id: null,
    details: {...commRegFields},
    texts: {},
    busy: false,
};

const getters = {
    outdatedCommencementDate : state => {
        if (!state.details.custrecord_comm_date) return true;

        let commDate = new Date(state.details.custrecord_comm_date.split('/').reverse().join('-'))
        let today = new Date();
        today.setHours(0, 0, 0);

        return commDate <= today;
    }
};

const actions = {
    async init() {
        if (!useCustomerStore().id || !useSalesRecordStore().id) return;

        let data = await http.get('getCommencementRegister', {customerId: useCustomerStore().id, salesRecordId: useSalesRecordStore().id});

        if (!Array.isArray(data) || !data.length) return;

        for (let fieldId in commRegFields) this.details[fieldId] = data[0][fieldId]; // there could be multiple comm regs, we take only the first result
    },
};


export const useCRStore = defineStore('commencement-register', {
    state: () => state,
    getters,
    actions,
});
