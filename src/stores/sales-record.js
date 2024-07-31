import { defineStore } from 'pinia';
import {salesRecord as salesRecordFields} from '@/utils/defaults.mjs';
import http from '@/utils/http.mjs';

const state = {
    id: null,
    details: {...salesRecordFields},
    texts: {},
    busy: false,
};

const getters = {
    campaignId : state => parseInt(state.details.custrecord_sales_campaign),
    isMpPremium : state => [71, 72, 77].includes(parseInt(state.details.custrecord_sales_campaign)),
};

const actions = {
    async init() {
        if (!this.id) return;

        let data = await http.get('getSalesRecord', {salesRecordId: this.id});

        for (let fieldId in salesRecordFields) {
            this.details[fieldId] = data[fieldId];
            this.texts[fieldId] = data[fieldId + '_text'];
        }
    },
};


export const useSalesRecordStore = defineStore('sales-record', {
    state: () => state,
    getters,
    actions,
});
