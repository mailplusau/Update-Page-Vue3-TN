<script setup>
import {rules} from '@/utils/utils.mjs';
import {useMainStore} from '@/stores/main';
import {useMiscStore} from '@/stores/misc';
import {useCustomerStore} from '@/stores/customer';
import {ref} from 'vue';
import DatePicker from '@/components/shared/DatePicker.vue';
import {useLpoCampaignStore} from '@/stores/campaign-lpo';

const { validate } = rules;
const mainStore = useMainStore();
const miscStore = useMiscStore();
const customerStore = useCustomerStore();
const lpoCampaign = useLpoCampaignStore();

const mainForm = ref(null);
const formValid = ref(true);

function editForm() {
    lpoCampaign.formDisabled = false;
}

function cancelEditing() {
    lpoCampaign.formDisabled = true;
    customerStore.resetForm();
    mainForm.value['resetValidation']();
}

function resetForm() {
    customerStore.resetForm();
    mainForm.value['resetValidation']();
}

async function saveForm() {
    let res = await mainForm.value['validate']();
    if (!res.valid) return console.log('Fix the errors');

    lpoCampaign.saveLpoValidations().then();
}
</script>

<template>
    <v-container v-if="mainStore.mode.value !== mainStore.mode.options.NEW && lpoCampaign.isActive">
        <v-form ref="mainForm" v-model="formValid" lazy-validation :disabled=lpoCampaign.formDisabled>
            <v-row justify="center">
                <v-col cols="12" class="text-center">
                    <v-divider class="mb-5"></v-divider>
                    <p class="text-h5 font-weight-bold text-primary">LPO Validation</p>
                </v-col>

                <v-col cols="5">
                    <v-autocomplete density="compact" label="Parent LPO" :disabled=lpoCampaign.formDisabled
                                    v-model="customerStore.form.data.custentity_lpo_parent_account"
                                    :items="lpoCampaign.parentLpoFranchisees"
                                    variant="underlined" color="primary"
                                    :rules="[v => validate(v, 'required')]"
                    ></v-autocomplete>
                </v-col>

                <v-col cols="4">
                    <v-autocomplete density="compact" label="Invoice Payment Method" :disabled=lpoCampaign.formDisabled
                                    v-model="customerStore.form.data.custentity_invoice_method"
                                    :items="lpoCampaign.invoiceMethodOptions"
                                    variant="underlined" color="primary"
                                    :rules="[v => validate(v, 'required')]"
                                    @update:model-value="lpoCampaign.handleInvoiceMethodChanged"
                    ></v-autocomplete>
                </v-col>

                <v-col cols="3">
                    <v-autocomplete density="compact" label="Profile Assigned" :disabled=lpoCampaign.formDisabled
                                    v-model="customerStore.form.data.custentity_lpo_profile_assigned"
                                    :items="lpoCampaign.lpoProfileOptions"
                                    variant="underlined" color="primary"
                    ></v-autocomplete>
                </v-col>

                <v-col cols="4">
                    <v-text-field density="compact" label="MyPost Business Number" :disabled=lpoCampaign.formDisabled
                                  v-model="customerStore.form.data.custentity_mypost_business_number"
                                  variant="underlined" color="primary"
                    ></v-text-field>
                </v-col>

                <v-col cols="4">
                    <v-autocomplete density="compact" label="Account Type" :disabled=lpoCampaign.formDisabled
                                    v-model="customerStore.form.data.custentity_lpo_account_type_linked"
                                    :items="lpoCampaign.lpoAccountTypes"
                                    variant="underlined" color="primary"
                    ></v-autocomplete>
                </v-col>

                <v-col cols="4">
                    <v-autocomplete density="compact" label="Account Status" :disabled=lpoCampaign.formDisabled
                                    v-model="customerStore.form.data.custentity_lpo_account_status"
                                    :items="lpoCampaign.lpoAccountStatus"
                                    :rules="[v => validate(v, 'required')]"
                                    variant="underlined" color="primary"
                    ></v-autocomplete>
                </v-col>

                <v-col cols="12">
                    <v-autocomplete density="compact" label="Previous Carrier" :disabled=lpoCampaign.formDisabled multiple
                                    v-model="customerStore.form.data.custentity_previous_carrier"
                                    :items="miscStore.carrierList"
                                    variant="underlined" color="primary"
                    ></v-autocomplete>
                </v-col>

                <v-col cols="3">
                    <v-autocomplete density="compact" label="Lead Priority" :disabled=lpoCampaign.formDisabled
                                    v-model="customerStore.form.data.custentity_lpo_lead_priority"
                                    :items="lpoCampaign.leadPriorityOptions"
                                    variant="underlined" color="primary"
                    ></v-autocomplete>
                </v-col>

                <v-col cols="3">
                    <v-autocomplete density="compact" label="Pre-authorisation" :disabled=lpoCampaign.formDisabled
                                    v-model="customerStore.form.data.custentity_cust_lpo_pre_auth"
                                    :items="miscStore.lpoPreAuthOptions"
                                    variant="underlined" color="primary"
                    ></v-autocomplete>
                </v-col>

                <v-col cols="6">
                    <DatePicker v-model="customerStore.form.data.custentity_lpo_date_last_sales_activity" title="Date of Last Sale Activity">
                        <template v-slot:activator="{ activatorProps, displayDate }">
                            <v-text-field v-bind="activatorProps" :model-value="displayDate" :disabled=lpoCampaign.formDisabled
                                          label="Date of Last Sale Activity" variant="underlined" density="compact" color="primary" ></v-text-field>
                        </template>
                    </DatePicker>
                </v-col>

                <v-col cols="12">
                    <v-textarea density="compact" label="LPO Note:" :disabled=lpoCampaign.formDisabled variant="outlined" hide-details
                                v-model="customerStore.form.data.custentity_lpo_notes" color="primary"></v-textarea>
                </v-col>


                <v-col cols="12" class="text-center">
                    <v-btn v-if=lpoCampaign.formDisabled @click="editForm">Edit LPO Information</v-btn>
                    <template v-else>
                        <v-btn class="mx-2" @click="resetForm">Reset</v-btn>
                        <v-btn class="mx-2" @click="cancelEditing" color="red">Cancel</v-btn>
                        <v-btn class="mx-2" @click="saveForm" color="green">Save</v-btn>
                    </template>
                </v-col>

                <v-col cols="12">
                    <v-divider></v-divider>
                </v-col>
            </v-row>
        </v-form>
    </v-container>
</template>

<style scoped>

</style>