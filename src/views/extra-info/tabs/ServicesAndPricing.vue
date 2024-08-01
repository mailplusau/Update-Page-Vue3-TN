<script setup>
import {onMounted, ref} from 'vue';
import {useCustomerStore} from '@/stores/customer';
import {formatPrice} from '@/utils/utils.mjs';
import http from '@/utils/http.mjs';

const customerStore = useCustomerStore();
const baseUrl = 'https://' + import.meta.env.VITE_NS_REALM + '.app.netsuite.com';

const formDisabled = ref(true);
const formValid = ref(true);
const mainForm = ref(null);
const services = ref({
    data: [],
    busy: true,
    columns: [
        {value: 'custrecord_service_text', title: 'Name', sortable: false, align: 'center'},
        {value: 'custrecord_service_description', title: 'Description', sortable: false, align: 'center'},
        {value: 'price', title: 'Price', sortable: false, align: 'center'},
    ],
})
const pricing = ref({
    data: [],
    busy: true,
    columns: [
        {value: 'name', title: 'Name', sortable: false, align: 'center'},
        {value: 'price', title: 'Price', sortable: false, align: 'center'},
    ],
})

onMounted(() => {
    Promise.allSettled([
        _getAssignedServices(),
        _getItemPricing(),
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
    customerStore.saveCustomer(['custentity_customer_pricing_notes']).then(() => {
        formDisabled.value = true;
    });
}

async function _getAssignedServices() {
    if (!customerStore.id) return;

    services.value.busy = true;
    let data = await http.get('getAssignedServices', {customerId: customerStore.id});
    services.value.data = [...data];
    services.value.busy = false;
}

async function _getItemPricing() {
    if (!customerStore.id) return;

    pricing.value.busy = true;
    let data = await http.get('getItemPricing', {customerId: customerStore.id});
    pricing.value.data = [...data];
    pricing.value.busy = false;
}

function goToServiceAndPricingPage() {
    let params = {
        custid: customerStore.id,
        servicechange: 1
    }
    params = JSON.stringify(params);

    let upload_url = baseUrl + top['nlapiResolveURL']('SUITELET', 'customscript_sl_smc_main', 'customdeploy_sl_smc_main') + '&unlayered=T&custparam_params=' + params;
    top.open(upload_url, "_blank");
}
</script>

<template>
    <v-card flat color="background">
        <v-container class="pa-6">
            <v-form ref="mainForm" v-model="formValid" lazy-validation :disabled="formDisabled">
                <v-row justify="center">
                    <v-col cols="12">
                        <v-textarea label="Pricing Notes" color="primary" variant="outlined"
                                    :disabled="formDisabled" density="compact" hide-details
                                    v-model="customerStore.form.data.custentity_customer_pricing_notes"></v-textarea>
                    </v-col>

                    <v-col cols="12" class="text-center">
                        <v-btn v-if="formDisabled" @click="editForm">Edit Pricing Note</v-btn>
                        <template v-else>
                            <v-btn class="mx-2" @click="cancelEditing">Cancel</v-btn>
                            <v-btn class="mx-2" @click="resetForm">Reset</v-btn>
                            <v-btn class="mx-2" @click="saveForm">Save</v-btn>
                        </template>
                    </v-col>
                </v-row>

                <v-row justify="center">
                    <v-col cols="6">
                        <v-data-table :headers="services.columns" :items="services.data" :loading="services.busy"
                                      no-data-text="No Service to Show" :items-per-page="-1"
                                      class="elevation-5 bg-background" hide-default-footer loading-text="Loading services...">

                            <template v-slot:top>
                                <v-toolbar color="grey" dark density="compact">
                                    <v-toolbar-title class="text-subtitle-1">Services</v-toolbar-title>
                                </v-toolbar>
                            </template>

                            <template v-slot:[`item.price`]="{ item }">
                                {{ formatPrice(item.custrecord_service_price) }}
                            </template>
                        </v-data-table>
                    </v-col>

                    <v-col cols="6">
                        <v-data-table :headers="pricing.columns" :items="pricing.data" :loading="pricing.busy"
                                      no-data-text="No Item Pricing to Show" :items-per-page="-1"
                                      class="elevation-5 bg-background" hide-default-footer loading-text="Loading item pricing...">

                            <template v-slot:top>
                                <v-toolbar color="grey" dark density="compact">
                                    <v-toolbar-title class="text-subtitle-1">Item Pricing</v-toolbar-title>
                                </v-toolbar>
                            </template>

                            <template v-slot:[`item.price`]="{ item }">
                                {{ formatPrice(item.price) }}
                            </template>
                        </v-data-table>
                    </v-col>

                    <v-col cols="12">
                        <v-btn color="primary" variant="outlined" @click="goToServiceAndPricingPage">
                            Update Service & Financial Tab <v-icon class="ml-2" size="small">mdi-open-in-new</v-icon>
                        </v-btn>
                    </v-col>
                </v-row>
            </v-form>
        </v-container>
    </v-card>
</template>

<style scoped>

</style>