<script setup>
import {ref} from 'vue';
import {useCustomerStore} from '@/stores/customer';
import {useFranchiseeStore} from '@/stores/franchisee';
import {useMiscStore} from '@/stores/misc';
import {rules} from '@/utils/utils.mjs';
import {customer as customerDetails} from '@/utils/defaults.mjs';

const { validate } = rules;
const miscStore = useMiscStore();
const customerStore = useCustomerStore();
const franchiseeStore = useFranchiseeStore();

const formDisabled = ref(true);
const formValid = ref(true);
const mainForm = ref(null);

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

    customerStore.saveCustomer(Object.keys(customerDetails.miscInfo)).then(() => { formDisabled.value = true; });
}
</script>

<template>
    <v-card flat color="background">
        <v-container class="pa-6">
            <v-form ref="mainForm" v-model="formValid" lazy-validation :disabled="formDisabled">
                <v-row justify="center">
                    <v-col cols="6">
                        <v-text-field density="compact" variant="underlined" label="MAAP Bank Account #" v-model="customerStore.form.data.custentity_maap_bankacctno"
                                      disabled color="primary"></v-text-field>
                    </v-col>

                    <v-col cols="6">
                        <v-text-field density="compact" variant="underlined" label="MAAP Parent Bank Account #" v-model="customerStore.form.data.custentity_maap_bankacctno_parent"
                                      disabled color="primary"></v-text-field>
                    </v-col>

                    <v-col cols="6">
                        <v-text-field density="compact" variant="underlined" label="Franchisee Name" v-model="franchiseeStore.details.companyname"
                                      disabled color="primary"></v-text-field>
                    </v-col>

                    <v-col cols="6">
                        <v-text-field density="compact" variant="underlined" label="Main Contact" v-model="franchiseeStore.details.custentity3"
                                      disabled color="primary"></v-text-field>
                    </v-col>

                    <v-col cols="6">
                        <v-text-field density="compact" variant="underlined" label="Franchisee ABN" v-model="franchiseeStore.details.custentity_abn_franchiserecord"
                                      disabled color="primary"></v-text-field>
                    </v-col>

                    <v-col cols="6">
                        <v-text-field density="compact" variant="underlined" label="Franchisee Email" v-model="franchiseeStore.details.email"
                                      disabled color="primary"></v-text-field>
                    </v-col>

                    <v-col cols="6">
                        <v-text-field density="compact" variant="underlined" label="Franchisee Phone" v-model="franchiseeStore.details.custentity2"
                                      disabled color="primary"></v-text-field>
                    </v-col>

                    <v-col cols="6">
                        <v-autocomplete density="compact" variant="underlined" label="Portal Credit Card Payment"
                                        v-model="customerStore.form.data.custentity_portal_cc_payment"
                                        :items="miscStore.yesNoOptions"
                                        :disabled="formDisabled" color="primary"></v-autocomplete>
                    </v-col>

                    <v-col cols="6">
                        <v-autocomplete density="compact" variant="underlined" label="Invoice Method"
                                        v-model="customerStore.form.data.custentity_invoice_method"
                                        :items="miscStore.yesNoOptions"
                                        :disabled="formDisabled" color="primary"></v-autocomplete>
                    </v-col>

                    <v-col cols="6">
                        <v-text-field density="compact" variant="underlined" label="Account CC Email" v-model="customerStore.form.data.custentity_accounts_cc_email"
                                      :rules="[v => validate(v, 'email')]"
                                      :disabled="formDisabled" color="primary"></v-text-field>
                    </v-col>

                    <v-col cols="6">
                        <v-text-field density="compact" variant="underlined" label="MPEX PO #" v-model="customerStore.form.data.custentity_mpex_po"
                                      :disabled="formDisabled" color="primary"></v-text-field>
                    </v-col>

                    <v-col cols="6">
                        <v-text-field density="compact" variant="underlined" label="Customer's PO #" v-model="customerStore.form.data.custentity11"
                                      :disabled="formDisabled" color="primary"></v-text-field>
                    </v-col>

                    <v-col cols="4">
                        <v-autocomplete density="compact" variant="underlined" label="Terms"
                                        v-model="customerStore.form.data.terms"
                                        :items="miscStore.invoiceTerms.map(item => ({title: item.title, value: item.value + ''}))"
                                        :disabled="formDisabled" color="primary"></v-autocomplete>
                    </v-col>

                    <v-col cols="4">
                        <v-text-field density="compact" variant="underlined" label="Customer's Terms" v-model="customerStore.form.data.custentity_finance_terms"
                                      :disabled="formDisabled" color="primary"></v-text-field>
                    </v-col>

                    <v-col cols="4">
                        <v-autocomplete density="compact" variant="underlined" label="Invoice Cycle"
                                        v-model="customerStore.form.data.custentity_mpex_invoicing_cycle"
                                        :items="miscStore.invoiceCycles"
                                        :disabled="formDisabled" color="primary"></v-autocomplete>
                    </v-col>

                    <v-col cols="12" class="text-center">
                        <v-btn v-if="formDisabled" @click="editForm">Edit Information</v-btn>
                        <template v-else>
                            <v-btn class="mx-2" @click="cancelEditing">Cancel</v-btn>
                            <v-btn class="mx-2" @click="resetForm">Reset</v-btn>
                            <v-btn class="mx-2" @click="saveForm">Save</v-btn>
                        </template>
                    </v-col>

                </v-row>
            </v-form>
        </v-container>
    </v-card>
</template>

<style scoped>

</style>