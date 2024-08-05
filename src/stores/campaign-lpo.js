import { defineStore } from 'pinia';
import http from '@/utils/http.mjs';
import {useGlobalDialog} from '@/stores/global-dialog';
import {useCustomerStore} from '@/stores/customer';
import {useSalesRecordStore} from '@/stores/sales-record';
import {customer as customerFields} from '@/utils/defaults.mjs';
import {useUserStore} from '@/stores/user';
import {useMainStore} from '@/stores/main';

const state = {
    id: null,
    busy: true,
    formDisabled: true,
    lpoFranchisees: [],

    invoiceMethodOptions: [
        {value: '2', title: 'Customer'},
        {value: '10', title: 'LPO'},
    ],
    lpoProfileOptions: [
        {value: '1', title: 'LPO'},
        {value: '2', title: 'Corporate'},
        {value: '3', title: 'Not Linked'},
    ],
    lpoAccountTypes: [
        {value: '1', title: 'MyPost'},
        {value: '2', title: 'eParcel'},
        {value: '3', title: 'Charge Account'},
    ],
    leadPriorityOptions: [
        {value: '1', title: 'High'},
        {value: '2', title: 'Medium'},
        {value: '3', title: 'Low'},
    ],
    lpoAccountStatus: [
        {value: '1', title: 'Active'},
        {value: '2', title: 'Inactive'},
    ]
};

const getters = {
    isActive : state => {
        let index = state.lpoFranchisees
            .findIndex(item => parseInt(item.custentity_lpo_linked_franchisees) === parseInt(useCustomerStore().details.partner))

        // Franchisee is linked to LPO and campaign in sales record set as LPO (69) or LPO - BAU (76)
        return index >= 0 && [69, 76].includes(parseInt(useSalesRecordStore().details.custrecord_sales_campaign));
    },
    isLastSalesWithin90Days : () => { // check if last sales activity is set within the last 90 days
        if (!useCustomerStore().details.custentity_lpo_date_last_sales_activity) return false;

        let lastSales = new Date(useCustomerStore().details.custentity_lpo_date_last_sales_activity).getTime();
        let today = new Date().getTime();

        return (today - lastSales) < 90 * 24 * 60 * 60 * 1000;
    },
    parentLpoFranchisees : state => {
        return state.lpoFranchisees
            .filter(item => parseInt(item.custentity_lpo_linked_franchisees) === parseInt(useCustomerStore().details.partner))
            .map(item => ({value: item.internalid, title: item.entityid + ' ' + item.companyname}));
    }
};

const actions = {
    async init() {
        if (!useCustomerStore().id || !useSalesRecordStore().id) return;

        const customerDetails = useCustomerStore().details;
        const customerForm = useCustomerStore().form.data;

        await _getLpoFranchisees(this);

        let index = this.parentLpoFranchisees.findIndex(item => parseInt(item.value) === parseInt(customerDetails.custentity_lpo_parent_account));
        if (index < 0) {
            customerForm.custentity_lpo_parent_account = null;
            this.formDisabled = false;
        }
    },
    async convertToLPO() {
        useGlobalDialog().displayProgress('', 'Converting to LPO Campaign. Please Wait...');

        await http.post('convertLeadToLPO', { customerId: useCustomerStore().id, salesRecordId: useSalesRecordStore().id });

        await useGlobalDialog().close(2000, 'Conversion complete. Redirecting to NetSuite...');

        useCustomerStore().goToRecordPage();
    },
    async convertToLPOBAU() {
        useGlobalDialog().displayProgress('', 'Converting to LPO - BAU Campaign. Please Wait...');

        await http.post('convertLeadToLPO', { customerId: useCustomerStore().id, salesRecordId: useSalesRecordStore().id, isBAU: true });

        await useGlobalDialog().close(2000, 'Conversion complete. Redirecting to NetSuite...');

        useCustomerStore().goToRecordPage();
    },
    async convertToBAU() {
        useGlobalDialog().displayProgress('', 'Converting to Business As Usual. Please Wait...');

        await http.post('convertLeadToBAU', { customerId: useCustomerStore().id, salesRecordId: useSalesRecordStore().id });

        await useGlobalDialog().close(2000, 'Conversion complete. Redirecting to NetSuite...');

        useCustomerStore().goToRecordPage();
    },
    handleInvoiceMethodChanged() {
        const customerStore = useCustomerStore();
        
        if (parseInt(customerStore.form.data.custentity_invoice_method) === 2) {
            customerStore.form.data.custentity_invoice_by_email = true;
            customerStore.form.data.custentity18 = true;
            customerStore.form.data.custentity_exclude_debtor = false;
            customerStore.form.data.custentity_fin_consolidated = false;
        } else if (parseInt(customerStore.form.data.custentity_invoice_method) === 10) {
            customerStore.form.data.custentity_invoice_by_email = true;
            customerStore.form.data.custentity18 = true;
            customerStore.form.data.custentity_exclude_debtor = true;
            customerStore.form.data.custentity_fin_consolidated = true;
        }
    },

    async saveLpoValidations() {
        const customerDetails = useCustomerStore().details;
        const customerForm = useCustomerStore().form.data;
        const fieldsToSave = Object.keys(customerFields.lpoCampaign);
        
        // if LPO pays the invoices and company name does not have prefix yet, we prefix company name with LPO
        // else if LPO doesn't pay invoices and lead source is not LPO - Transition (281559), we strip the prefix
        if (parseInt(customerForm.custentity_invoice_method) === 10 && !/^(LPO - )/gi.test(customerForm.companyname)) {
            customerForm.companyname = 'LPO - ' + customerForm.companyname;
            fieldsToSave.push('companyname');
        } else if (parseInt(customerForm.custentity_invoice_method) !== 10 && parseInt(customerDetails.leadsource) !== 281559) {
            customerForm.companyname = customerForm.companyname.replace(/^(LPO - )/gi, '');
            fieldsToSave.push('companyname');
        }
        
        await useCustomerStore().saveCustomer(fieldsToSave);

        this.formDisabled = true;
    },

    validateData() {
        let unsavedChanges = [];
        let fieldsToCheck = [
            {id: 'custentity_lpo_account_status', name: 'Account Status'}
        ];

        if (!this.isActive || useMainStore().mode.value !== useMainStore().mode.options.CALL_CENTER) return unsavedChanges;

        // Bypass this when user has Admin role
        if (useUserStore().isAdmin) return unsavedChanges;

        if (!this.formDisabled) unsavedChanges.push('LPO Validation: There are unsaved changes.');
        else {
            for (let field of fieldsToCheck)
                if (!useCustomerStore().form.data[field.id]) {
                    this.formDisabled = false;
                    unsavedChanges.push(`LPO Validation: The field [${field.name}] is empty.`);
                    break;
                }
        }

        let index = this.parentLpoFranchisees.findIndex(item => parseInt(item.value) === parseInt(useCustomerStore().details.custentity_lpo_parent_account));
        if (index < 0) unsavedChanges.push('LPO Validation: [Parent LPO] field is required');

        return unsavedChanges;
    }
};

async function _getLpoFranchisees(ctx) {
    ctx.lpoFranchisees = await http.get('getLpoFranchisees');
}


export const useLpoCampaignStore = defineStore('campaign-lpo', {
    state: () => state,
    getters,
    actions,
});
