import { defineStore } from 'pinia';
import http from "@/utils/http.mjs";
import { useCustomerStore } from "@/stores/customer";

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
    invoiceCycles: [],
    yesNoOptions: [],
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
    carrierList: [],
    lpoAccountStatus: [
        {value: 1, title: 'Active'},
        {value: 2, title: 'Inactive'},
    ]
};

const getters = {

};

const actions = {
    init() {
        const customer = useCustomerStore();
        let alwaysLoad = ['getIndustries', 'getLeadSources', 'getFranchisees', 'getRoles', 'getCarrierList', 'getCustomerStatuses'];
        let conditionalLoad = [
            'getInvoiceCycles',
            'getYesNoOptions',
            'getMPExWeeklyUsageOptions',
            'getServicesOfInterestOptions',
            'getCommencementTypeOptions',
            'getInOutOptions',
        ];

        let dataToFetch = alwaysLoad.map(item => this[item]());
        if (customer.id)
            dataToFetch.push(...conditionalLoad.map(item => this[item]()));

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
    async getCustomerStatuses() {
        let data = await http.get('getCustomerStatuses')

        if (Array.isArray(data)) {
            let results = await Promise.allSettled(data.map(item => http.get('getCustomerStatusById', {statusId: item['internalid']})));
            this.statuses = results
                .filter(result => result.status === 'fulfilled')
                .map(result => ({
                    title: `${result.value.stage} - ${result.value.name}`,
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
