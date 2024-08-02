<script setup>
import {useCustomerStore} from '@/stores/customer';
import {useDisplay, useGoTo} from 'vuetify';
import {useMainStore} from '@/stores/main';
import {useLpoCampaignStore} from '@/stores/campaign-lpo';
import {computed} from 'vue';
import {useContactStore} from '@/stores/contacts';
import {useAddressesStore} from '@/stores/addresses';
import {useGlobalDialog} from '@/stores/global-dialog';

const { mdAndDown } = useDisplay();
const goTo = useGoTo();
const mainStore = useMainStore();
const customerStore = useCustomerStore();
const contactStore = useContactStore();
const addressStore = useAddressesStore();
const globalDialog = useGlobalDialog();
const lpoCampaign = useLpoCampaignStore();

const speedDialButtons = computed(() => [
    {
        key: 'customerMainView', color: customerStore.form.disabled || mainStore['mode.is.NEW'] ? 'primary' : 'red',
        icon: 'mdi-account', show: true, tooltip: 'Basic Information'
    },
    {
        key: 'lpoValidationProcess', color: lpoCampaign.formDisabled ? 'primary' : 'red',
        icon: 'mdi-text-account', show: !mainStore['mode.is.NEW'] && lpoCampaign.isActive, tooltip: 'LPO Validation'
    },
    {
        key: 'businessPhotoView', color: 'primary',
        icon: 'mdi-image-multiple', show: !mainStore['mode.is.NEW'] && lpoCampaign.isActive && customerStore.photos.data.length, tooltip: 'Photos of the Business'
    },
    {
        key: 'addressMainView', color: 'primary',
        icon: 'mdi-map-marker', show: true, tooltip: 'Addresses'
    },
    {
        key: 'contactMainView', color: 'primary',
        icon: 'mdi-card-account-details', show: true, tooltip: 'Contacts'
    },
    {
        key: 'extraInfoView', color: 'primary',
        icon: 'mdi-information-variant', show: !mainStore['mode.is.NEW'], tooltip: 'Additional Information'
    },
    {
        key: 'activityNoteView', color: 'primary',
        icon: 'mdi-note-text-outline', show: mainStore['mode.is.UPDATE_OR_CC'], tooltip: 'Sales Activity Notes'
    },
    {
        key: 'invoiceView', color: 'primary',
        icon: 'mdi-invoice-text', show: !mainStore['mode.is.NEW'], tooltip: 'Invoices'
    },
    {
        key: 'serviceChangeView', color: 'primary',
        icon: 'mdi-truck-outline', show: mainStore['mode.is.FINALISE'], tooltip: 'Service Changes'
    },
    {
        key: 'saveNewLeadButtonContainer', color: 'green',
        icon: 'mdi-content-save-all-outline', show: mainStore['mode.is.NEW'], tooltip: 'Save New Lead'
    },
    {
        key: 'callCenterView', color: 'green',
        icon: 'mdi-phone', show: mainStore['mode.is.CALL_CENTER'], tooltip: 'Call Centre'
    },
    {
        key: 'salesFinalisationView', color: 'green',
        icon: 'mdi-check-outline', show: mainStore['mode.is.FINALISE'], tooltip: 'Sales Finalisation'
    },
].filter(button => button.show));

function clearLocalStorageData() {
    globalDialog.displayProgress('', 'Cleaning temporary data. Please wait...');
    customerStore.$reset();
    addressStore.$reset();
    contactStore.$reset();
    customerStore.clearStateFromLocalStorage();
    addressStore.clearStateFromLocalStorage();
    contactStore.clearStateFromLocalStorage();
    globalDialog.close(1500, 'Form data has been cleared')
}
</script>

<template>
    <template v-for="(spButton, index) in speedDialButtons">
        <v-btn v-if="spButton.show" :key="spButton.key" :color="spButton.color" @click="goTo('#' + spButton.key)" icon="" size="small"
               :style="'position: fixed; right: 10px; bottom: ' + (10 + (speedDialButtons.length - index - 1) * 50) + 'px;'">
            <v-icon>{{ spButton.icon}}</v-icon>
            <v-tooltip activator="parent" location="start">{{ spButton.tooltip }}</v-tooltip>
        </v-btn>
    </template>


    <v-btn style="position: fixed; left: 10px; bottom: 10px;" color="red" class="text-none px-2" title="Clear form data"
           v-if="mainStore['mode.is.NEW']"
           :icon="mdAndDown" @click="clearLocalStorageData()">
        <v-icon>mdi-trash-can-outline</v-icon> {{ mdAndDown ? '' : `Clear Forms` }}
    </v-btn>
    <v-btn style="position: fixed; left: 10px; bottom: 10px;" color="pink" class="text-none px-2" title="Back to NetSuite Record Page"
           v-else
           :icon="mdAndDown" @click="useCustomerStore().goToRecordPage()">
        <v-icon>mdi-chevron-left</v-icon> {{ mdAndDown ? '' : `Customer's Record` }}
    </v-btn>
</template>

<style scoped>

</style>