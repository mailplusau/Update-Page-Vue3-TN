import { defineStore } from 'pinia';

const state = {
    id: null,
};

const getters = {

};

const actions = {
    async init() {

    },
};


export const useCRStore = defineStore('commencement-register', {
    state: () => state,
    getters,
    actions,
});
