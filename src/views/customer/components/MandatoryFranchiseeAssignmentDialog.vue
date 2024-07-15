<script setup>
import {useCustomerStore} from '@/stores/customer';
import {useMiscStore} from '@/stores/misc';
import {useUserStore} from '@/stores/user';

const customerStore = useCustomerStore();
const miscStore = useMiscStore();
const userStore = useUserStore();

function assignFranchisee() {
    customerStore.saveCustomer();
    customerStore.franchiseeSelector.open = false;
}

function outOfTerritory() {
    customerStore.setAsOutOfTerritory();
    customerStore.franchiseeSelector.open = false;
}
</script>

<template>
    <v-dialog v-model="customerStore.franchiseeSelector.open" width="500" :persistent="!userStore.isAdmin">
        <v-card class="bg-background v-container">
            <v-row justify="center" align="center">
                <v-col cols="auto">
                    Please assign a correct franchisee to the lead
                </v-col>
                <v-col cols="12" class="text-center">
                    <v-autocomplete label="Select a franchisee" variant="outlined" density="compact" hide-details
                                    v-model="customerStore.form.data.partner"
                                    :items="miscStore.franchisees">

                    </v-autocomplete>
                    <a class="mt-1 text-caption" href="https://www.google.com/maps/d/u/0/viewer?mid=1W9mX1KtLJGmCk8brHRkl0OkyVWJEN7s&ll=-32.326468625954625%2C139.23892807495866&z=5" target="_blank">
                        Check Franchisee Territory
                    </a>
                </v-col>
                <v-col cols="8">
                    <v-btn color="green" block @click="assignFranchisee">
                        Assign Franchisee
                        <v-tooltip activator="parent" location="bottom">Assign the selected franchisee to this lead</v-tooltip>
                    </v-btn>
                </v-col>
                <v-col cols="auto">
                    <v-btn size="small" color="red" variant="tonal" @click="outOfTerritory">
                        Out of Territory
                        <v-tooltip activator="parent" location="top">Mark this lead as Out Of Territory</v-tooltip>
                    </v-btn>
                </v-col>
            </v-row>
        </v-card>
    </v-dialog>
</template>

<style scoped>

</style>