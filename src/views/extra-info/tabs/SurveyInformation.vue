<script setup>
import {ref} from 'vue';
import {useCustomerStore} from '@/stores/customer';
import {useMiscStore} from '@/stores/misc';
import {rules} from '@/utils/utils.mjs';
import {customer as customerDetails} from '@/utils/defaults.mjs';

const { validate } = rules;
const customerStore = useCustomerStore();
const miscStore = useMiscStore();

const formDisabled = ref(true);
const formValid = ref(true);
const mainForm = ref(null);
const frequency = ref(null);
const isUsingRegularly = ref(false);

function editForm() {
    formDisabled.value = false;
}

function cancelEditing() {
    formDisabled.value = true;
    customerStore.resetForm();
    mainForm.value['resetValidation']();
    handleFrequencyChanged();
}

function resetForm() {
    customerStore.resetForm();
    mainForm.value['resetValidation']();
    handleFrequencyChanged();
}

async function saveForm() {
    let res = await mainForm.value.validate();
    if (!res.valid) return console.log('Fix the errors');
    
    customerStore.saveCustomer(Object.keys(customerDetails.surveyInfo)).then(() => { formDisabled.value = true; });
}

function handleFrequencyChanged() {
    isUsingRegularly.value = (parseInt(customerStore.form.data.custentity_ap_mail_parcel) === 1); // Check if this is Yes (1) or No (2)

    if (!isUsingRegularly.value) { // Set the dependent fields to No (2) if this is false
        customerStore.form.data.custentity_customer_express_post = '2';
        customerStore.form.data.custentity_customer_local_couriers = '2';
    }
}
</script>

<template>
    <v-card flat color="background">
        <v-container class="pa-6">
            <v-form ref="mainForm" v-model="formValid" lazy-validation :disabled="formDisabled">
                <v-row justify="center">
                    <v-col cols="6">
                        <v-autocomplete density="compact" variant="underlined" label="Multisite"
                                        v-model="customerStore.form.data.custentity_category_multisite"
                                        :items="miscStore.trueFalseOptions"
                                        :disabled="formDisabled"
                        ></v-autocomplete>
                    </v-col>

                    <v-col cols="6">
                        <v-text-field density="compact" variant="underlined" label="Multisite Link"
                                      v-model="customerStore.form.data.custentity_category_multisite_link"
                                      :disabled="formDisabled"
                        ></v-text-field>
                    </v-col>

                    <v-col cols="6">
                        <v-autocomplete density="compact" variant="underlined" label="Using Mail / Parcels / Satchels Regularly?"
                                        v-model="customerStore.form.data.custentity_ap_mail_parcel"
                                        :items="miscStore.yesNoOptions"
                                        :disabled="formDisabled"
                                        @update:model-value="handleFrequencyChanged"
                        ></v-autocomplete>
                    </v-col>

                    <template v-if="isUsingRegularly">
                        <v-col cols="6">
                            <v-autocomplete density="compact" variant="underlined" label="Frequency of Mail / Parcels / Satchels"
                                            v-model="frequency"
                                            :items="miscStore.usageFrequencyOptions"
                                            :rules="[v => validate(v, 'required')]"
                                            :disabled="formDisabled"
                            ></v-autocomplete>
                        </v-col>

                        <v-col cols="4">
                            <v-autocomplete density="compact" variant="underlined" label="Using Express Post?"
                                            v-model="customerStore.form.data.custentity_customer_express_post"
                                            :items="miscStore.yesNoOptions"
                                            :disabled="formDisabled"
                            ></v-autocomplete>
                        </v-col>

                        <v-col cols="4">
                            <v-autocomplete density="compact" variant="underlined" label="Using Local Couriers?"
                                            v-model="customerStore.form.data.custentity_customer_local_couriers"
                                            :items="miscStore.yesNoOptions"
                                            :rules="[v => validate(v, 'required')]"
                                            :disabled="formDisabled"
                            ></v-autocomplete>
                        </v-col>
                    </template>

                    <v-col :cols="isUsingRegularly ? 4 : 6">
                        <v-autocomplete density="compact" variant="underlined" label="Using P.O Box?"
                                        v-model="customerStore.form.data.custentity_customer_po_box"
                                        :items="miscStore.yesNoOptions"
                                        :disabled="formDisabled"
                        ></v-autocomplete>
                    </v-col>

                    <v-col cols="6">
                        <v-autocomplete density="compact" variant="underlined" label="Bank Visit?"
                                        v-model="customerStore.form.data.custentity_customer_bank_visit"
                                        :items="miscStore.yesNoOptions"
                                        :disabled="formDisabled"
                        ></v-autocomplete>
                    </v-col>

                    <v-col cols="6">
                        <v-autocomplete density="compact" variant="underlined" label="Classify Lead"
                                        v-model="customerStore.form.data.custentity_lead_type"
                                        :items="miscStore.classifyLeadOptions"
                                        :rules="[v => validate(v, 'required')]"
                                        :disabled="formDisabled"
                        ></v-autocomplete>
                    </v-col>

                    <v-col cols="12" class="text-center">
                        <v-btn v-if="formDisabled" @click="editForm">Edit Survey Information</v-btn>
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