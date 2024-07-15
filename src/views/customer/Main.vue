<script setup>
import { ref, computed } from "vue";
import { useMiscStore } from "@/stores/misc";
import { useCustomerStore } from "@/stores/customer";
import { rules, allowOnlyNumericalInput, debounce } from "@/utils/utils.mjs";
import {useUserStore} from '@/stores/user';
import {useMainStore} from '@/stores/main';
import MandatoryFranchiseeAssignmentDialog from '@/views/customer/components/MandatoryFranchiseeAssignmentDialog.vue';
import PortalAccessControlDialog from '@/views/customer/components/PortalAccessControlDialog.vue';

const { validate } = rules;
const mainStore = useMainStore();
const miscStore = useMiscStore();
const customerStore = useCustomerStore();
const userStore = useUserStore();
const formDisabled = computed(() => customerStore.form.disabled);
const formBusy = computed(() => customerStore.form.busy);
const mainForm = ref(null);

let showOldCustomerFields = ref(false);
let checkingOldCustomerId = ref(false);
let valid = ref(true);


const debouncedHandleOldCustomerIdChanged = debounce(async () => {
    if (!customerStore.form.data.custentity_old_customer) return;

    checkingOldCustomerId.value = true;
    await customerStore.handleOldCustomerIdChanged();
    checkingOldCustomerId.value = false;
    return !!customerStore.form.data.custentity_old_zee || 'Invalid Id for old customer'
}, 2000);

const accountManagers = computed(() => {
    let data = [...miscStore.accountManagers];

    if (customerStore.details['custentity_mp_toll_salesrep'])
        data.push({
            title: customerStore.texts['custentity_mp_toll_salesrep'],
            value: customerStore.details['custentity_mp_toll_salesrep']
        })

    return data;
})

function handleLeadSourceChanged(newValue) {
    // show these fields when lead source is Change of Entity or Relocation
    if (parseInt(newValue) === 202599 || parseInt(newValue) === 217602)
        showOldCustomerFields.value = true;
    else { // otherwise hide the fields and reset them
        showOldCustomerFields.value = false;
        customerStore.form.data.custentity_old_customer = '';
        customerStore.form.data.custentity_old_zee = '';
    }
    mainForm.value['validate']();
}

function handleOldCustomerIdChanged() {
    debouncedHandleOldCustomerIdChanged();
    return true;
}

function editForm() {
    customerStore.disableForm(false);
}

function cancelEditing() {
    customerStore.disableForm();
    customerStore.resetForm();
    mainForm.value['resetValidation']();
}

function resetForm() {
    customerStore.resetForm();
    mainForm.value['resetValidation']();
}

async function saveForm() {
    let res = await mainForm.value.validate();
    console.log('Form validation result', res);
    if (!res.valid) return console.log('Fix the errors');
    console.log('Form validated, let\'s go');
    customerStore.saveCustomer().then();
}
</script>

<template>
    <v-container fluid>
        <v-form ref="mainForm" v-model="valid" lazy-validation :disabled="formDisabled">
            <v-row justify="center">
                <v-col cols="12" class="text-center">
                    <p class="text-h5 font-weight-bold text-primary">Basic Information</p>
                </v-col>

                <v-col cols="4">
                    <v-text-field density="compact" label="Internal ID" disabled variant="underlined"
                                  :model-value="customerStore.form.data.entityid || 'New Customer'"></v-text-field>
                </v-col>

                <v-col cols="8">
                    <v-text-field density="compact" v-if="userStore.isFranchisee" label="Account Manager"
                                  :model-value="'Sales Rep'" disabled variant="underlined"></v-text-field>
                    <v-autocomplete density="compact" v-else label="Account Manager" :disabled="formDisabled || formBusy"
                                    variant="underlined"
                                    v-model="customerStore.form.data.custentity_mp_toll_salesrep"
                                    :items="accountManagers"
                                    :rules="[v => validate(v, !userStore.isFranchisee ? 'required' : '')]"
                    ></v-autocomplete>
                </v-col>

                <v-col :cols="userStore.isFranchisee ? 12 : 8">
                    <v-text-field density="compact" label="Company Name"
                                  v-model="customerStore.form.data.companyname"
                                  variant="underlined"
                                  :rules="[v => validate(v, 'required|minLength:5')]"
                    ></v-text-field>
                </v-col>

                <v-col cols="4" v-if="!userStore.isFranchisee">
                    <v-text-field density="compact" label="ABN" v-model="customerStore.form.data.vatregnumber"
                                  variant="underlined"
                                  @keydown="allowOnlyNumericalInput"
                                  :rules="[v => validate(v, 'required|abn')]"
                    ></v-text-field>
                </v-col>

                <v-col cols="7" v-if="!userStore.isFranchisee">
                    <v-text-field density="compact" label="Account (main) email" v-model="customerStore.form.data.email"
                                  variant="underlined"
                                  :rules="[v => validate(v, 'email')]"
                    ></v-text-field>
                </v-col>

                <v-col cols="5" v-if="!userStore.isFranchisee">
                    <v-text-field density="compact" label="Account (main) phone" v-model="customerStore.form.data.altphone"
                                  variant="underlined"
                                  :rules="[v => validate(v, 'ausPhone')]"
                    ></v-text-field>
                </v-col>

                <v-col cols="7">
                    <v-text-field density="compact" label="Day-to-day email" v-model="customerStore.form.data.custentity_email_service"
                                  variant="underlined"
                                  :rules="[v => validate(v, 'email')]"
                    ></v-text-field>
                </v-col>

                <v-col cols="5">
                    <v-text-field density="compact" label="Day-to-day phone" v-model="customerStore.form.data.phone"
                                  variant="underlined"
                                  :rules="[v => validate(v, 'ausPhone')]"
                    ></v-text-field>
                </v-col>

                <v-col cols="6">
                    <v-text-field density="compact" label="Website" v-model="customerStore.form.data.custentity_website_page_url"
                                  variant="underlined"
                                  placeholder="https://"
                    ></v-text-field>
                </v-col>

                <v-col cols="6">
                    <v-autocomplete density="compact" label="Previous Carrier" :disabled="formDisabled || formBusy"
                                    v-model="customerStore.form.data.custentity_previous_carrier"
                                    :items="miscStore.carrierList"
                                    variant="underlined"
                                    :rules="[v => validate(v, 'required')]"
                    ></v-autocomplete>
                </v-col>

                <v-col cols="6" v-if="userStore.isAdmin">
                    <v-autocomplete density="compact" label="Franchisee" :disabled="formDisabled || formBusy"
                                    v-model="customerStore.form.data.partner"
                                    :items="miscStore.franchisees"
                                    variant="underlined"
                                    :rules="[v => validate(v, 'required')]"
                    ></v-autocomplete>
                </v-col>

                <v-col :cols="userStore.isAdmin ? 6 : 12" v-if="!userStore.isFranchisee">
                    <v-autocomplete density="compact" label="Lead Source" :disabled="formDisabled || formBusy"
                                    v-model="customerStore.form.data.leadsource"
                                    :items="miscStore.leadSources"
                                    variant="underlined"
                                    :rules="[v => validate(v, 'required')]"
                                    @update:model-value="handleLeadSourceChanged"
                    ></v-autocomplete>
                </v-col>

                <v-col cols="6" v-if="showOldCustomerFields">
                    <v-autocomplete density="compact" label="Old Franchisee" :readonly="true" :disabled="false"
                                    v-model="customerStore.form.data.custentity_old_zee"
                                    variant="underlined"
                                    persistent-placeholder placeholder="Please enter the correct ID for the old customer"
                                    :items="miscStore.franchisees"
                                    :rules="[v => !!v || 'Please provide Internal ID of Old Customer']"
                    ></v-autocomplete>
                </v-col>

                <v-col cols="6" v-if="showOldCustomerFields">
                    <v-text-field density="compact" label="Old Customer ID" v-model="customerStore.form.data.custentity_old_customer"
                                  @keydown="allowOnlyNumericalInput"
                                  variant="underlined"
                                  :disabled="checkingOldCustomerId" :loading="checkingOldCustomerId"
                                  :rules="[v => validate(v, 'required'), () => handleOldCustomerIdChanged()]"
                                  @update:model-value="debouncedHandleOldCustomerIdChanged"
                    ></v-text-field>
                </v-col>

                <v-col cols="6" v-if="!userStore.isFranchisee">
                    <v-autocomplete density="compact" label="Industry"
                                    v-model="customerStore.form.data.custentity_industry_category"
                                    variant="underlined"
                                    :items="miscStore.industries"
                                    :rules="[v => validate(v, 'required')]"
                    ></v-autocomplete>
                </v-col>

                <v-col cols="6" v-if="!userStore.isFranchisee">
                    <v-autocomplete density="compact" label="Status"
                                    v-model="customerStore.form.data.entitystatus"
                                    variant="underlined"
                                    :items="miscStore.statuses"
                                    :rules="[v => validate(v, 'required')]"
                    ></v-autocomplete>
                </v-col>

                <v-col cols="12" class="text-center" v-if="mainStore.mode.value !== mainStore.mode.options.NEW">
                    <v-btn v-if="formDisabled" @click="editForm">Edit Customer's Details</v-btn>
                    <template v-else>
                        <v-btn class="mx-2" @click="cancelEditing">Cancel</v-btn>
                        <v-btn class="mx-2" @click="resetForm">Reset</v-btn>
                        <v-btn class="mx-2" @click="saveForm" :disabled="false">Save</v-btn>
                    </template>
                </v-col>
            </v-row>
        </v-form>

        <v-row justify="center" v-if="customerStore.id && [1032, 3, 1022, 1001, 1023].includes(userStore.role) && mainStore.mode.value !== mainStore.mode.options.NEW">
            <v-col cols="auto">
                <PortalAccessControlDialog>
                    <template v-slot:activator="{ activatorProps, hasPortalAccess }">
                        <v-btn v-bind="activatorProps" variant="elevated" :color="hasPortalAccess ? 'green' : 'red'" size="small" class="text-none">
                            Portal Access: {{hasPortalAccess ? 'YES' : 'NO'}}
                        </v-btn>
                    </template>
                </PortalAccessControlDialog>
            </v-col>
        </v-row>

        <MandatoryFranchiseeAssignmentDialog />
    </v-container>
</template>

<style scoped>

</style>