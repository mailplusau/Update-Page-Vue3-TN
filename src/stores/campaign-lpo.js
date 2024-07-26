import { defineStore } from 'pinia';
import http from '@/utils/http.mjs';
import {useGlobalDialog} from '@/stores/global-dialog';
import {useCustomerStore} from '@/stores/customer';
import {useSalesRecordStore} from '@/stores/sales-record';

const state = {
    id: null,

    lpoFranchisees: [],
};

const getters = {
    isActive : state => {
        let index = state.lpoFranchisees
            .findIndex(item => parseInt(item.custentity_lpo_linked_franchisees) === parseInt(useCustomerStore().details.partner))

        // Franchisee is linked to LPO and campaign in sales record set as LPO (69) or LPO - Bypass (76)
        return index >= 0 && [69, 76].includes(parseInt(useSalesRecordStore().details.custrecord_sales_campaign));
    },
    isLastSalesWithin90Days : () => { // check if last sales activity is set within the last 90 days
        if (!useCustomerStore().details.custentity_lpo_date_last_sales_activity) return false;

        let lastSales = new Date(useCustomerStore().details.custentity_lpo_date_last_sales_activity).getTime();
        let today = new Date().getTime();

        return (today - lastSales) < 90 * 24 * 60 * 60 * 1000;
    },
};

const actions = {
    async init() {
        if (!useCustomerStore().id || !useSalesRecordStore().id) return;

        await _getLpoFranchisees(this);
    },
    async convertToLPO() {
        useGlobalDialog().displayProgress('', 'Converting to LPO Campaign. Please Wait...');

        await http.post('convertLeadToLPO', { customerId: useCustomerStore().id, salesRecordId: useSalesRecordStore().id });

        await useGlobalDialog().close(5000, 'Conversion complete. Redirecting to NetSuite. Please Wait...');

        useCustomerStore().goToRecordPage();
    },
    async convertToBAU() {
        useGlobalDialog().displayProgress('', 'Converting to Business As Usual. Please Wait...');

        await http.post('convertLeadToBAU', { customerId: useCustomerStore().id, salesRecordId: useSalesRecordStore().id });

        await useGlobalDialog().close(5000, 'Conversion complete. Redirecting to NetSuite. Please Wait...');

        useCustomerStore().goToRecordPage();
    },
};

async function _getLpoFranchisees(ctx) {
    ctx.lpoFranchisees = await http.get('getLpoFranchisees');
}


export const useLpoCampaignStore = defineStore('campaign-lpo', {
    state: () => state,
    getters,
    actions,
});
