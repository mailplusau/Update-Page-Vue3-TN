import { defineStore } from 'pinia';
import http from '@/utils/http.mjs';

const state = {
    data: []
};

const getters = {
    accountManagers : state => state.data.filter(item => [
        668711, // Lee Russell
        696160, // Kerina Helliwell
        668712, // Belinda Urbani
    ].includes(parseInt(item.internalid))),
};

const actions = {
    async init() {
        this.data = await http.get('getActiveEmployees')
    },
};


export const useEmployeeStore = defineStore('employees', {
    state: () => state,
    getters,
    actions,
});
