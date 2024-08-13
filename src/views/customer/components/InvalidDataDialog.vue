<script setup>
import {useCustomerStore} from '@/stores/customer';
import {useMiscStore} from '@/stores/misc';
import {useUserStore} from '@/stores/user';
import {ref} from 'vue';
import {useGlobalDialog} from '@/stores/global-dialog';
import {rules} from '@/utils/utils.mjs';

const { validate } = rules;
const customerStore = useCustomerStore();
const miscStore = useMiscStore();
const userStore = useUserStore();
const globalDialog = useGlobalDialog();
const mainForm = ref(null);
const formValid = ref(true);
const territoryUrl = 'https://www.google.com/maps/d/u/0/viewer?mid=1W9mX1KtLJGmCk8brHRkl0OkyVWJEN7s&ll=-32.326468625954625%2C139.23892807495866&z=5';

async function saveData() {
    let res = await mainForm.value['validate']();
    if (!res.valid) return console.log('Fix the errors');

    globalDialog.displayProgress('', 'Saving data. Please wait...')
    await customerStore.saveCustomer(customerStore.invalidDataDialog.problems, false);
    await customerStore.validateNSData();
    await globalDialog.close(1000, 'Correction saved. Thank you!');
}

function outOfTerritory() {
    customerStore.setAsOutOfTerritory();
    customerStore.invalidDataDialog.open = false;
}
</script>

<template>
    <v-dialog v-model="customerStore.invalidDataDialog.open" width="500" :persistent="!userStore.isAdmin">
        <v-card class="bg-background v-container">
            <v-form class="v-row align-center justify-center" ref="mainForm" v-model="formValid" lazy-validation>
                <v-col cols="auto">
                    <h3>Please correct the following data</h3>
                </v-col>

                <v-col cols="12" v-if="customerStore.invalidDataDialog.problems.includes('partner')">
                    <p class="text-subtitle-2">
                        Assign a correct franchisee to the lead (<a :href="territoryUrl" target="_blank">Check Franchisee Territory</a>).
                    </p>
                    <v-autocomplete label="" variant="outlined" density="compact" color="primary"
                                    v-model="customerStore.form.data.partner"
                                    :items="miscStore.franchisees"
                                    :rules="[v => validate(v, 'required')]">
                    </v-autocomplete>
                </v-col>

                <v-col cols="12" v-if="customerStore.invalidDataDialog.problems.includes('leadsource')">
                    <p class="text-subtitle-2">
                        Lead Source <b class="text-red">{{ customerStore.texts.leadsource }}</b> is invalid.<br>Please assign another lead source.
                    </p>
                    <v-autocomplete label="" variant="outlined" density="compact" color="primary"
                                    v-model="customerStore.form.data.leadsource"
                                    :items="miscStore.leadSources.filter(item => !item['isinactive'])"
                                    item-value="internalid" item-title="title"
                                    :rules="[v => validate(v, 'required')]">
                    </v-autocomplete>
                </v-col>

                <v-col cols="8">
                    <v-btn color="green" block @click="saveData">
                        Save Data
                    </v-btn>
                </v-col>
                <v-col cols="auto">
                    <v-btn size="small" color="red" variant="tonal" @click="outOfTerritory">
                        Out of Territory
                        <v-tooltip activator="parent" location="top">Mark this lead as Out Of Territory</v-tooltip>
                    </v-btn>
                </v-col>
            </v-form>
        </v-card>
    </v-dialog>
</template>

<style scoped>

</style>