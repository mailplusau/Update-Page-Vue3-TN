<script setup>
import {onMounted, ref} from 'vue';
import {useCustomerStore} from '@/stores/customer';
import {useMiscStore} from '@/stores/misc';
import {customer as customerDetails} from '@/utils/defaults.mjs';
import http from '@/utils/http.mjs';

const customerStore = useCustomerStore();
const miscStore = useMiscStore();

const formDisabled = ref(true);
const formValid = ref(true);
const mainForm = ref(null);
const productPricing = ref({
    data: [],
    busy: true,
    columns: [
        {value: 'custrecord_prod_pricing_delivery_speeds_text', title: 'Delivery Speeds', align: 'center', sortable: false},
        {value: 'custrecord_prod_pricing_pricing_plan_text', title: 'Pricing Plan', align: 'center', sortable: false},
        {value: 'custrecord_prod_pricing_b4_text', title: 'B4', align: 'center', sortable: false},
        {value: 'custrecord_prod_pricing_250g_text', title: '250G', align: 'center', sortable: false},
        {value: 'custrecord_prod_pricing_500g_text', title: '500G', align: 'center', sortable: false},
        {value: 'custrecord_prod_pricing_1kg_text', title: '1KG', align: 'center', sortable: false},
        {value: 'custrecord_prod_pricing_3kg_text', title: '3KG', align: 'center', sortable: false},
        {value: 'custrecord_prod_pricing_5kg_text', title: '5KG', align: 'center', sortable: false},
        {value: 'custrecord_prod_pricing_10kg_text', title: '10KG', align: 'center', sortable: false},
        {value: 'custrecord_prod_pricing_20kg_text', title: '20KG', align: 'center', sortable: false},
        {value: 'custrecord_prod_pricing_25kg_text', title: '25KG', align: 'center', sortable: false},
    ],
});
const weeklyUsage = ref({
    data: [],
    busy: false,
    columns: [
        {value: 'col1', title: 'Week Used', sortable: true, align: 'center'},
        {value: 'col2', title: 'Usage Count', sortable: true, align: 'center'},
    ],
})

onMounted(() => {
    Promise.allSettled([
        _getProductPricing(),
        _getWeeklyUsage(),
    ]).then();
})

function editForm() {
    formDisabled.value = false;
}

function cancelEditing() {
    formDisabled.value = true;
    customerStore.resetForm();
    mainForm.value['resetValidation']();
}

function resetForm() {
    customerStore.resetForm();
    mainForm.value['resetValidation']();
}

async function saveForm() {
    let res = await mainForm.value.validate();
    if (!res.valid) return console.log('Fix the errors');

    customerStore.saveCustomer(Object.keys(customerDetails.mpProducts)).then(() => { formDisabled.value = true; });
}

async function _getProductPricing() {
    productPricing.value.busy = true;

    let data = await http.get('getProductPricing', {customerId: customerStore.id});

    productPricing.value.data = [...data];

    productPricing.value.busy = false;
}

async function _getWeeklyUsage() {
    weeklyUsage.value.busy = true;

    let data = await http.get('getMpExWeeklyUsage', {customerId: customerStore.id});

    weeklyUsage.value.data = [...data];

    weeklyUsage.value.busy = false;
}
</script>

<template>
    <v-card flat color="background">
        <v-container class="pa-6">
            <v-form ref="mainForm" v-model="formValid" lazy-validation>
                <v-row justify="center">
                    <v-col cols="4">
                        <v-autocomplete label="Is MPEX Customer" density="compact" variant="outlined"
                                        v-model="customerStore.form.data.custentity_mpex_customer"
                                        :items="miscStore.yesNoOptions"
                                        :disabled="formDisabled"
                        ></v-autocomplete>
                    </v-col>

                    <v-col cols="4">
                        <v-autocomplete label="MP Weekly Usage" density="compact" variant="outlined"
                                        v-model="customerStore.form.data.custentity_form_mpex_usage_per_week"
                                        :items="miscStore.mpExWeeklyUsageOptions"
                                        :disabled="formDisabled"
                        ></v-autocomplete>
                    </v-col>

                    <v-col cols="4">
                        <v-text-field label="MP Expected Usage" v-model="customerStore.form.data.custentity_exp_mpex_weekly_usage"
                                      :disabled="formDisabled" density="compact" variant="outlined"
                        ></v-text-field>
                    </v-col>
                    
                    <v-col cols="12" class="text-center">
                        <v-btn v-if="formDisabled" @click="editForm">Edit Pricing Note</v-btn>
                        <template v-else>
                            <v-btn class="mx-2" @click="cancelEditing">Cancel</v-btn>
                            <v-btn class="mx-2" @click="resetForm">Reset</v-btn>
                            <v-btn class="mx-2" @click="saveForm">Save</v-btn>
                        </template>
                    </v-col>


                    <v-col cols="12">
                        <v-data-table :headers="productPricing.columns" :items="productPricing.data" :loading="productPricing.busy"
                                      no-data-text="No Product Pricing to Show" :items-per-page="-1"
                                      :cell-props="{ class: 'cell-text-size-11px' }"
                                      class="elevation-5 bg-background" hide-default-footer loading-text="Loading product pricing...">

                            <template v-slot:top>
                                <v-toolbar color="grey" dark density="compact">
                                    <v-toolbar-title class="text-subtitle-1">Pricing Structures</v-toolbar-title>
                                </v-toolbar>
                            </template>
                        </v-data-table>
                    </v-col>

                    <v-col cols="12">
                        <v-data-table :headers="weeklyUsage.columns" :items="weeklyUsage.data" :loading="weeklyUsage.busy"
                                      no-data-text="No Weekly Usage Yet" :items-per-page="5"
                                      class="elevation-5 bg-background" loading-text="Loading weekly usage...">

                            <template v-slot:top>
                                <v-toolbar color="grey" dark density="compact">
                                    <v-toolbar-title class="text-subtitle-1">MPEX - Weekly Usage</v-toolbar-title>
                                </v-toolbar>
                            </template>
                        </v-data-table>
                    </v-col>
                </v-row>
            </v-form>
        </v-container>
    </v-card>
</template>

<style scoped>

</style>