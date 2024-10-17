<script setup>
import {useCustomerStore} from '@/stores/customer';
import {rules} from '@/utils/utils.mjs';
import {useUserStore} from '@/stores/user';
import {ref} from 'vue';
import {useGlobalDialog} from '@/stores/global-dialog';

const { validate } = rules;
const globalDialog = useGlobalDialog();
const customerStore = useCustomerStore();
const userStore = useUserStore();

const mainForm = ref(null);
const formValid = ref(true);

async function proceed() {
    let res = await mainForm.value['validate']();
    if (!res.valid) return console.log('Fix the errors');

    globalDialog.displayProgress('', 'Setting Customer As [Out of Territory]. Please Wait...')
    await customerStore.setAsOutOfTerritory();
    globalDialog.displayProgress('', 'Customer Is Set As [Out of Territory]. Redirecting To Their Record Page. Please Wait...');
    customerStore.goToRecordPage();
}

async function proceedWithoutEmail() {
    let res = await globalDialog.displayConfirmation('Alert', 'Mark this lead as Out Of Territory without sending email?', 'Yes', 'Cancel')

    if (!res) return;

    globalDialog.displayProgress('', 'Setting Customer As [Out of Territory]. Please Wait...')
    customerStore.outOfTerritoryDialog.email = '';
    await customerStore.setAsOutOfTerritory();
    globalDialog.displayProgress('', 'Customer Is Set As [Out of Territory]. Redirecting To Their Record Page. Please Wait...');
    customerStore.goToRecordPage();
}

function cancel() {
    customerStore.invalidDataDialog.open = true;
    customerStore.outOfTerritoryDialog.open = false;
}

customerStore.$subscribe((mutation, state) => {
    if (state.outOfTerritoryDialog.open)
        customerStore.outOfTerritoryDialog.email = customerStore.details.custentity_email_service
})

</script>

<template>
    <v-dialog v-model="customerStore.outOfTerritoryDialog.open" width="500" :persistent="!userStore.isAdmin">
        <v-card class="bg-background v-container">
            <v-form class="v-row align-center justify-center" ref="mainForm" v-model="formValid" lazy-validation>
                <v-col cols="auto">
                    <h3 class="text-primary">Marking lead as [Out Of Territory]</h3>
                </v-col>

                <v-col cols="12">
                    <p class="text-subtitle-2">
                        An email will be sent to the following address (which you can change) informing them of being Out Of Territory.
                    </p>
                    <v-text-field label="" variant="underlined" density="compact" color="primary"
                                    v-model="customerStore.outOfTerritoryDialog.email"
                                    :rules="[v => validate(v, 'required|email'), v => v !== 'abc@abc.com' || 'Please enter a valid email']">
                    </v-text-field>
                </v-col>

                <v-col cols="4">
                    <v-btn block @click="cancel">
                        Cancel
                    </v-btn>
                </v-col>
                <v-col cols="8">
                    <v-btn color="green" block @click="proceed">
                        Out of Territory
                    </v-btn>
                </v-col>
                <v-col cols="auto">
                    <v-btn color="red" variant="tonal" size="small" @click="proceedWithoutEmail">
                        Out of Territory without sending email
                    </v-btn>
                </v-col>
            </v-form>
        </v-card>
    </v-dialog>
</template>

<style scoped>

</style>