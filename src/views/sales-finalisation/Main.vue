<script setup>
import {ref} from 'vue';
import {rules} from '@/utils/utils.mjs';
import {useMainStore} from '@/stores/main';
import {useMiscStore} from '@/stores/misc';
import {useCRStore} from '@/stores/comm-reg';
import {useServiceChangesStore} from '@/stores/service-changes';
import DatePicker from '@/components/shared/DatePicker.vue';
import CommencementForm from '@/views/sales-finalisation/components/CommencementForm.vue';
import {useGlobalDialog} from '@/stores/global-dialog';
import {useCustomerStore} from '@/stores/customer';

const { validate } = rules;
const mainStore = useMainStore();
const miscStore = useMiscStore();
const commRegStore = useCRStore();
const globalDialog = useGlobalDialog();
const customerStore = useCustomerStore();
const serviceChangeStore = useServiceChangesStore();

const mainForm = ref(null);
const formValid = ref(true);

async function validateForm() {
    let res = await mainForm.value['validate']();
    return (!!commRegStore.form.attachedFile || !!commRegStore.form.data.custrecord_scand_form) && res.valid;
}

async function finaliseCustomer() {
    if (!await validateForm()) return console.log('Fix the errors');

    if (serviceChangeStore.data.length) await commRegStore.finalise();
    else
        globalDialog.displayInfo('Warning', 'You are about finalise this customer without any service changes. Continue?', false,[
            { text: 'cancel'},
            { color: 'red', text: 'Proceed', action: () => { commRegStore.finalise(); }}
        ], 400)
}

function onIntersect() {
    mainForm.value['resetValidation']();
    commRegStore.form.customerDisplayName = commRegStore.form.customerDisplayName || customerStore.details.companyname;
}

</script>

<template>
    <v-container v-if="mainStore['mode.is.FINALISE']" v-intersect="onIntersect">
        <v-form ref="mainForm" v-model="formValid" :disabled="commRegStore.form.disabled">
            <v-row justify="center">
                <v-col cols="12" class="text-center">
                    <v-divider class="mb-5"></v-divider>
                    <p class="text-h5 font-weight-bold text-primary">Sales Finalisation</p>
                </v-col>

                <v-col cols="4">
                    <CommencementForm />
                </v-col>

                <v-col cols="8">
                    <v-row>
                        <v-col cols="12">
                            <DatePicker v-model="commRegStore.form.data.custrecord_comm_date" title="Date - Commencement">
                                <template v-slot:activator="{ activatorProps, displayDate, readonly }">
                                    <v-text-field v-bind="readonly ? null : activatorProps" :model-value="displayDate" :disabled="commRegStore.form.disabled" persistent-hint
                                                  :rules="[v => validate(v, 'required')]"
                                                  :hint="'Please use [Update Service Changes] to change Effective Date.'"
                                                  label="Date - Commencement:" variant="outlined" density="compact" color="primary" readonly></v-text-field>
                                </template>
                            </DatePicker>
                        </v-col>

                        <v-col cols="6">
                            <DatePicker v-model="commRegStore.form.data.custrecord_comm_date_signup" title="Date - Signup">
                                <template v-slot:activator="{ activatorProps, displayDate }">
                                    <v-text-field v-bind="activatorProps" :model-value="displayDate" :disabled="commRegStore.form.disabled" persistent-placeholder
                                                  :rules="[v => validate(v, 'required')]"
                                                  label="Date - Signup:" variant="outlined" density="compact" color="primary" ></v-text-field>
                                </template>
                            </DatePicker>
                        </v-col>

                        <v-col cols="6">
                            <DatePicker v-model="commRegStore.form.data.custrecord_date_entry" title="Date - Entry">
                                <template v-slot:activator="{ activatorProps, displayDate }">
                                    <v-text-field v-bind="activatorProps" :model-value="displayDate" :disabled="commRegStore.form.disabled" persistent-placeholder
                                                  :rules="[v => validate(v, 'required')]"
                                                  label="Date - Entry:" variant="outlined" density="compact" color="primary" ></v-text-field>
                                </template>
                            </DatePicker>
                        </v-col>

                        <v-col cols="7">
                            <v-autocomplete density="compact" label="Commencement Type:" :disabled="commRegStore.form.disabled"
                                            v-model="commRegStore.form.data.custrecord_sale_type"
                                            :items="miscStore.commencementTypeOptions"
                                            :rules="[v => validate(v, 'required')]"
                                            variant="outlined" color="primary" persistent-placeholder
                            ></v-autocomplete>
                        </v-col>

                        <v-col cols="5">
                            <v-autocomplete density="compact" label="Inbound / Outbound:" :disabled="commRegStore.form.disabled"
                                            v-model="commRegStore.form.data.custrecord_in_out"
                                            :items="miscStore.inOutOptions"
                                            :rules="[v => validate(v, 'required')]"
                                            variant="outlined" color="primary" persistent-placeholder
                            ></v-autocomplete>
                        </v-col>
                        <v-col cols="12">
                            <v-text-field density="compact" label="Customer's Display Name (for printing):"
                                          :disabled="commRegStore.form.disabled"
                                          v-model="commRegStore.form.customerDisplayName" counter
                                          :rules="[v => validate(v, 'required'), v => v.length <= 40 || 'Display name should have 40 characters or fewer.']"
                                          variant="outlined" color="primary" persistent-placeholder></v-text-field>
                        </v-col>
                        <v-col cols="12">
                            <DatePicker v-model="commRegStore.form.data.custrecord_tnc_agreement_date" title="T&C Agreement Date">
                                <template v-slot:activator="{ activatorProps, displayDate, clearInput }">
                                    <v-text-field v-bind="activatorProps" :model-value="displayDate" :disabled="commRegStore.form.disabled" persistent-placeholder
                                                  label="T&C Agreement Date:" variant="outlined" density="compact" color="primary"
                                                  :append-icon="!!displayDate ? 'mdi-trash-can-outline' : ''"
                                                  persistent-hint hint="Set T&C Agreement Date to put Commencement Register on Scheduled."
                                                  @click:append.stop="clearInput()"></v-text-field>
                                </template>
                            </DatePicker>
                        </v-col>
                    </v-row>
                </v-col>

                <v-col cols="12" v-if="serviceChangeStore.data.length">
                    <v-btn color="green" size="large" @click="finaliseCustomer()" block class="mb-10 elevation-10" :disabled="commRegStore.form.disabled">
                        <v-icon class="mr-2">mdi-check-outline</v-icon> Finalise Customer
                    </v-btn>
                </v-col>
                <v-col cols="auto" v-else>
                    <v-btn color="primary" size="large" @click="finaliseCustomer()" class="mb-10 elevation-5 text-none" :disabled="commRegStore.form.disabled">
                        Finalise Customer Without Service Change
                    </v-btn>
                </v-col>
            </v-row>
        </v-form>
    </v-container>
</template>

<style scoped>

</style>