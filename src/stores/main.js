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

const state = {
    standaloneMode: false,
    callCenterMode: false,
    pageTitle: VARS.pageTitle,

    dev: {
        sidebar: false,
    },
    mode: {
        value: 'new',
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
            useMiscStore().init(),
        ])
    },
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

    const userStore = useUserStore();

    if (ctx.callCenterMode) ctx.mode.value = ctx.mode.options.CALL_CENTER;
    else if (useSalesRecordStore().id && userStore.isAdmin) ctx.mode.value = ctx.mode.options.FINALISE;
}

export const useMainStore = defineStore('main', {
    state: () => state,
    getters,
    actions,
});
