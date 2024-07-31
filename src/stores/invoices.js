import { defineStore } from 'pinia';
import http from '@/utils/http.mjs';
import {useCustomerStore} from '@/stores/customer';
import {format, subDays, subMonths} from 'date-fns';

const state = {
    data: [],
    busy: false,
    status: {
        selected: null,
        options: [
            { value: null, title: 'All statuses'},
            {value: 'CustInvc:A', title: 'Open Invoices'},
            {value: 'CustInvc:B', title: 'Paid In Full'}
        ]
    },
    period: {
        selected: null,
        options: [
            { value: null, title: 'All time'},
            {
                value: format(subDays(new Date(), 7), 'dd/MM/yyyy'),
                title: 'Last 7 Days'
            },
            {
                value: format(subMonths(new Date(), 1), 'dd/MM/yyyy'),
                title: 'Last Month'
            },
            {
                value: format(subMonths(new Date(), 3), 'dd/MM/yyyy'),
                title: 'Last 3 Months'
            },
            {
                value: format(subMonths(new Date(), 6), 'dd/MM/yyyy'),
                title: 'Last 6 Months'
            },
        ]
    },
};

const getters = {

};

const actions = {
    async init() {
        if (!useCustomerStore().id)  return;

        await this.fetchInvoices();
    },
    async fetchInvoices() {
        this.busy = true;
        this.data = await http.get('getCustomerInvoices', {
            customerId: useCustomerStore().id,
            invoiceStatus: this.status.selected, 
            invoicePeriod: this.period.selected
        })
        this.busy = false;
    }
};


export const useInvoiceStore = defineStore('invoices', {
    state: () => state,
    getters,
    actions,
});
