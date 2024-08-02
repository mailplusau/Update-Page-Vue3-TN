import { defineStore } from 'pinia';
import http from '@/utils/http.mjs';

const state = {
    id: null,
    role: null,

    salesRep: {
        id: -1,
        name: 'Test Account Manager',
    }
};

const getters = {
    isAdmin : state => [3, 1032].includes(state.role),
    isFranchisee : state => state.role === 1000,
    notAdminOrFranchisee : state => ![3, 1000, 1032].includes(state.role),
    isMe : state => state.id === 1732844,
};

const actions = {
    async init() {
        let {role, id, salesRep} = await http.get('getCurrentUserDetails');

        this.role = parseInt(role);
        this.id = parseInt(id);
        this.salesRep.id = salesRep.id ? parseInt(salesRep.id) : null;
        this.salesRep.name = salesRep.name || null;
    },
};


export const useUserStore = defineStore('user', {
    state: () => state,
    getters,
    actions,
});
