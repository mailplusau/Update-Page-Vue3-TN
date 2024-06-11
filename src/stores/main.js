import { defineStore } from 'pinia';
import http from "@/utils/http.mjs";
import { useGlobalDialog } from "@/stores/global-dialog";
import { VARS } from "@/utils/utils.mjs";

const baseUrl = import.meta.env.VITE_NS_REALM;

const state = {
    callCenterMode: false,
    pageTitle: VARS.pageTitle
};

const getters = {

};

const actions = {
    async init() {

        await _readUrlParams(this);

        console.log(baseUrl);
    },
};

async function _readUrlParams(ctx) {
    console.log('_readUrlParams', ctx);
}

export const useMainStore = defineStore('main', {
    state: () => state,
    getters,
    actions,
});
