import { defineStore } from 'pinia';
import http from "@/utils/http.mjs";
import { useCustomerStore } from "@/stores/customer";
import {useSalesRecordStore} from '@/stores/sales-record';

const state = {
    industries: [],
    leadSources: [],
    franchisees: [],
    roles: [],
    statuses: [
        {value: 6, title: 'SUSPECT - New'},
        {value: 57, title: 'SUSPECT - Hot Lead'},
        {value: 13, title: 'CUSTOMER - Signed'},
    ],
    states: [
        {value: 1, title: 'NSW'},
        {value: 2, title: 'QLD'},
        {value: 3, title: 'VIC'},
        {value: 4, title: 'SA'},
        {value: 5, title: 'TAS'},
        {value: 6, title: 'ACT'},
        {value: 7, title: 'WA'},
        {value: 8, title: 'NT'},
        {value: 9, title: 'NZ'},
    ],
    invoiceMethods: [],
    invoiceCycles: [],
    invoiceTerms: [
        {value: 5, title: '1% 10 Net 30'},
        {value: 6, title: '2% 10 Net 30'},
        {value: 4, title: 'Due On Receipt'},
        {value: 7, title: 'Net 7 Days'},
        {value: 1, title: 'Net 15 Days'},
        {value: 2, title: 'Net 30 Days'},
        {value: 8, title: 'Net 45 Days'},
        {value: 3, title: 'Net 60 Days'},
        {value: 8, title: 'Net 90 Days'},
    ],
    trueFalseOptions: [
        {value: true, title: 'Yes'},
        {value: false, title: 'No'},
    ],
    yesNoOptions: [],
    classifyLeadOptions: [],
    usageFrequencyOptions: [],
    mpExWeeklyUsageOptions: [],
    servicesOfInterestOptions: [],
    commencementTypeOptions: [],
    inOutOptions: [],
    accountManagers: [
        {value: 668711, title: 'Lee Russell'},
        {value: 696160, title: 'Kerina Helliwell'},
        // {value: 690145, title: 'David Gdanski'},
        {value: 668712, title: 'Belinda Urbani'},
    ],
    parkingLotReasons: [],
    carrierList: [],
    lpoPreAuthOptions: [],
};

const getters = {

};

const actions = {
    init() {
        const customer = useCustomerStore();
        const salesRecord = useSalesRecordStore();

        let alwaysLoad = ['getIndustries', 'getLeadSources', 'getFranchisees', 'getRoles', 'getCarrierList', 'getCustomerStatuses'];
        let conditionalLoad = [
            'getInvoiceMethods',
            'getInvoiceCycles',
            'getYesNoOptions',
            'getMPExWeeklyUsageOptions',
            'getServicesOfInterestOptions',
            'getCommencementTypeOptions',
            'getInOutOptions',
            'getClassifyLeadOptions',
            'getUsageFrequencyOptions',
            'getParkingLotReasons',
        ];
        let lpoRelatedLoad = [
            'getLpoPreAuthOptions'
        ];

        let dataToFetch = [
            ...alwaysLoad,
            ...(customer.id ? conditionalLoad : []),
            ...(customer.id && salesRecord.id ? lpoRelatedLoad : []),
        ].map(item => this[item]());

        Promise.allSettled(dataToFetch).then();
    },
    async getIndustries() {
        await _fetchDataForHtmlSelect(this.industries,
            null, 'customlist_industry_category', 'internalId', 'name');
    },
    async getLeadSources() {
        await _fetchDataForHtmlSelect(this.leadSources,
            'customsearch_lead_source', 'campaign', 'internalId', 'title');
    },
    async getFranchisees() {
        await _fetchDataForHtmlSelect(this.franchisees,
            'customsearch_salesp_franchisee', 'partner', 'internalId', 'companyname');
    },
    async getRoles() {
        await _fetchDataForHtmlSelect(this.roles,
            'customsearch_salesp_contact_roles', 'contactrole', 'internalId', 'name');
    },
    async getInvoiceMethods() {
        await _fetchDataForHtmlSelect(this.invoiceMethods,
            null, 'customlist_invoice_method', 'internalId', 'name');
    },
    async getInvoiceCycles() {
        await _fetchDataForHtmlSelect(this.invoiceCycles,
            null, 'customlist_invoicing_cyle', 'internalId', 'name');
    },
    async getYesNoOptions() {
        await _fetchDataForHtmlSelect(this.yesNoOptions,
            null, 'customlist107_2', 'internalId', 'name');
    },
    async getMPExWeeklyUsageOptions() {
        await _fetchDataForHtmlSelect(this.mpExWeeklyUsageOptions,
            null, 'customlist_form_mpex_usage_per_week', 'internalId', 'name');
    },
    async getServicesOfInterestOptions() {
        await _fetchDataForHtmlSelect(this.servicesOfInterestOptions,
            null, 'customlist1081', 'internalId', 'name');
    },
    async getCommencementTypeOptions() {
        await _fetchDataForHtmlSelect(this.commencementTypeOptions,
            null, 'customlist_sale_type', 'internalId', 'name');
    },
    async getInOutOptions() {
        await _fetchDataForHtmlSelect(this.inOutOptions,
            null, 'customlist_in_outbound', 'internalId', 'name');
    },
    async getCarrierList() {
        await _fetchDataForHtmlSelect(this.carrierList,
            null, 'customlist_carrier', 'internalId', 'name');
    },
    async getUsageFrequencyOptions() {
        await _fetchDataForHtmlSelect(this.usageFrequencyOptions,
            null, 'customlist_usage_frequency', 'internalId', 'name');
    },
    async getClassifyLeadOptions() {
        await _fetchDataForHtmlSelect(this.classifyLeadOptions,
            null, 'customlist_classify_lead', 'internalId', 'name');
    },
    async getParkingLotReasons() {
        await _fetchDataForHtmlSelect(this.parkingLotReasons,
            null, 'customlist_parking_lot_reasons', 'internalId', 'name');
    },
    async getLpoPreAuthOptions() {
        await _fetchDataForHtmlSelect(this.lpoPreAuthOptions,
            null, 'customlist_parking_lot_reasons', 'internalId', 'name');
    },
    async getCustomerStatuses() {
        let data = await http.get('getCustomerStatuses')

        if (Array.isArray(data)) {
            let results = await Promise.allSettled(data.map(item => http.get('getCustomerStatusById', {statusId: item['internalid']})));
            this.statuses = results
                .filter(result => result.status === 'fulfilled')
                .map(result => ({
                    title: `${result.value.stage} - ${result.value.name} (${result.value.id})`,
                    value: result.value.id,
                }));
        }
    }
};

async function _fetchDataForHtmlSelect(stateObject, id, type, valueColumnName, textColumnName) {
    stateObject.splice(0);

    let data = await http.get('getSelectOptions', {
        id, type, valueColumnName, textColumnName
    });

    data.forEach(item => { stateObject.push(item); });
}

export const useMiscStore = defineStore('misc', {
    state: () => state,
    getters,
    actions,
});
