import { defineStore } from 'pinia';
import {salesRecord as salesRecordFields} from '@/utils/defaults.mjs';
import http from '@/utils/http.mjs';
import {useGlobalDialog} from '@/stores/global-dialog';
import {useCustomerStore} from '@/stores/customer';

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

        let tentativeSalesRecordId = this.id;
        let data = await http.get('getSalesRecord', {salesRecordId: tentativeSalesRecordId});
        this.id = null;

        if (data['custrecord_sales_completed'])
            return useGlobalDialog().displayError('Error',
                `Sales Record #${tentativeSalesRecordId} is already marked as Completed.`, 400, [
                    'spacer', {color: 'red', variant: 'elevated', text: 'Back to customer\'s record', action:() => { useCustomerStore().goToRecordPage() }}, 'spacer',
                ]);

        if (parseInt(data['custrecord_sales_customer']) !== parseInt(useCustomerStore().id))
            return useGlobalDialog().displayError('Error',
                `Sales Record #${tentativeSalesRecordId} does not belong to Customer #${useCustomerStore().id}.`, 450, [
                    'spacer', {color: 'red', variant: 'elevated', text: 'Back to customer\'s record', action:() => { useCustomerStore().goToRecordPage() }}, 'spacer',
                ]);

        this.id = tentativeSalesRecordId;

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
