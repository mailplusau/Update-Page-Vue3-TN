<script setup>
import {useCustomerStore} from '@/stores/customer';
import {useDisplay, useGoTo} from 'vuetify';
import {useMainStore} from '@/stores/main';
import {useLpoCampaignStore} from '@/stores/campaign-lpo';
import {computed} from 'vue';

const { mdAndDown } = useDisplay();
const goTo = useGoTo();
const mainStore = useMainStore();
const customerStore = useCustomerStore();
const lpoCampaign = useLpoCampaignStore();

const speedDialButtons = computed(() => [
    {
        key: 'customerMainView', color: customerStore.form.disabled || mainStore.mode.value === mainStore.mode.options.NEW ? 'primary' : 'red',
        icon: 'mdi-account', show: true, tooltip: 'Basic Information'
    },
    {
        key: 'lpoValidationProcess', color: lpoCampaign.formDisabled ? 'primary' : 'red',
        icon: 'mdi-text-account', show: mainStore.mode.value !== mainStore.mode.options.NEW && lpoCampaign.isActive, tooltip: 'LPO Validation'
    },
    {
        key: 'businessPhotoView', color: lpoCampaign.formDisabled ? 'primary' : 'red',
        icon: 'mdi-image-multiple', show: mainStore.mode.value !== mainStore.mode.options.NEW && lpoCampaign.isActive, tooltip: 'Photos of the Business'
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
        icon: 'mdi-information-variant', show: mainStore.mode.value !== mainStore.mode.options.NEW, tooltip: 'Additional Information'
    },
    {
        key: 'serviceChangeView', color: 'primary',
        icon: 'mdi-truck-outline', show: mainStore.mode.value === mainStore.mode.options.FINALISE, tooltip: 'Service Changes'
    },
    {
        key: 'saveNewLeadButtonContainer', color: 'green',
        icon: 'mdi-content-save-all-outline', show: mainStore.mode.value === mainStore.mode.options.NEW, tooltip: 'Save New Lead'
    },
    {
        key: 'callCenterView', color: 'green',
        icon: 'mdi-phone', show: mainStore.mode.value === mainStore.mode.options.CALL_CENTER, tooltip: 'Call Centre'
    },
    {
        key: 'salesFinalisationView', color: 'green',
        icon: 'mdi-check-outline', show: mainStore.mode.value === mainStore.mode.options.FINALISE, tooltip: 'Sales Finalisation'
    },
].filter(button => button.show))
</script>

<template>
    <template v-for="(spButton, index) in speedDialButtons">
        <v-btn v-if="spButton.show" :key="spButton.key" :color="spButton.color" @click="goTo('#' + spButton.key)" icon="" size="small"
               :style="'position: fixed; right: 10px; bottom: ' + (10 + (speedDialButtons.length - index - 1) * 50) + 'px;'">
            <v-icon>{{ spButton.icon}}</v-icon>
            <v-tooltip activator="parent" location="start">{{ spButton.tooltip }}</v-tooltip>
        </v-btn>
    </template>

    <v-btn style="position: fixed; left: 10px; bottom: 10px;" color="pink" class="text-none px-2" title="Back to NetSuite Record Page"
           v-if="mainStore.mode.value !== mainStore.mode.options.NEW"
           :icon="mdAndDown" @click="useCustomerStore().goToRecordPage()">
        <v-icon>mdi-chevron-left</v-icon> {{ mdAndDown ? '' : `Customer's Record` }}
    </v-btn>
</template>

<style scoped>

</style>