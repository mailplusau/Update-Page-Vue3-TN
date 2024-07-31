import { defineStore } from 'pinia';
import {getWindowContext, VARS} from "@/utils/utils.mjs";
import {useCustomerStore} from '@/stores/customer';
import {useUserStore} from '@/stores/user';
import {useMiscStore} from '@/stores/misc';
import {useSalesRecordStore} from '@/stores/sales-record';
import {useCRStore} from '@/stores/comm-reg';
import {useAddressesStore} from '@/stores/addresses';
import {useContactStore} from '@/stores/contacts';
import {useFranchiseeStore} from '@/stores/franchisee';
import {useLpoCampaignStore} from '@/stores/campaign-lpo';
import {useGlobalDialog} from '@/stores/global-dialog';
import {useServiceChangesStore} from '@/stores/service-changes';
import {useActivityNotesStore} from '@/stores/activity-notes';
import {useEmployeeStore} from '@/stores/employees';
import {useInvoiceStore} from '@/stores/invoices';

const state = {
    standaloneMode: false,
    callCenterMode: false,
    pageTitle: VARS.pageTitle,

    dev: {
        sidebar: false,
    },
    mode: {
        value: '',
        options: {
            NEW: 'new',
            UPDATE: 'update',
            FINALISE: 'finalise',
            CALL_CENTER: 'call_center',
        }
    }
};

const getters = {

};

const actions = {
    async init() {
        await Promise.allSettled([
            _readUrlParams(this),
            useUserStore().init(),
        ])

        await this.initModules();
    },
    async initModules() {
        _setMode(this);

        useCustomerStore().$reset();

        await Promise.allSettled([
            useCustomerStore().init(),
            useFranchiseeStore().init(),
            useAddressesStore().init(),
            useContactStore().init(),
            useActivityNotesStore().init(),
            useMiscStore().init(),
            useEmployeeStore().init(),
            useInvoiceStore().init(),

            useSalesRecordStore().init(),
            useCRStore().init(),
        ]);

        await Promise.allSettled([
            useLpoCampaignStore().init(),
            useServiceChangesStore().init(),
        ]);
    },
    validateData() {
        let unsavedChanges = [];

        unsavedChanges = [...unsavedChanges, ...useLpoCampaignStore().validateData()];
        unsavedChanges = [...unsavedChanges, ...useCustomerStore().validateData()];

        if (unsavedChanges.length) {
            unsavedChanges.unshift('Please check the following sections for unsaved changes:')
            useGlobalDialog().displayError('There are unsaved changes', unsavedChanges.join('<br>'))

            return false;
        }

        return true;
    }
};

async function _readUrlParams(ctx) {
    let currentUrl = getWindowContext().location.href;
    let [, queryString] = currentUrl.split('?');

    const params = new Proxy(new URLSearchParams(`?${queryString}`), {
        get: (searchParams, prop) => searchParams.get(prop),
    });

    ctx.standaloneMode = !!params['standalone'];
    ctx.callCenterMode = !!params['callCenter'];
    useCustomerStore().id = params['customerId'];
    useSalesRecordStore().id = params['salesRecordId'];
    useCRStore().id = params['commRegId']
}

function _setMode(ctx) {
    ctx.mode.value = ctx.mode.options.NEW;

    if (!useCustomerStore().id) return;

    ctx.mode.value = ctx.mode.options.UPDATE;

    if (ctx.callCenterMode) ctx.mode.value = ctx.mode.options.CALL_CENTER;
    else if (useSalesRecordStore().id && useUserStore().isAdmin) ctx.mode.value = ctx.mode.options.FINALISE;
}

export const useMainStore = defineStore('main', {
    state: () => state,
    getters,
    actions,
});
