<script setup>
import {useCustomerStore} from '@/stores/customer';
import {useDisplay, useGoTo} from 'vuetify';
import {useMainStore} from '@/stores/main';
import {useLpoCampaignStore} from '@/stores/campaign-lpo';

const { mdAndDown } = useDisplay();
const goTo = useGoTo();
const mainStore = useMainStore();
const customerStore = useCustomerStore();
const lpoCampaign = useLpoCampaignStore();
</script>

<template>
    <v-speed-dial transition="fade-transition" location-strategy="connected" location="right bottom" no-click-animation
                  :model-value="true" :close-on-content-click="false" :close-on-back="false" persistent>
        <template v-slot:activator="{ props: activatorProps }">
            <v-fab absolute disabled style="opacity: 0" v-bind="activatorProps"></v-fab>
        </template>

        <v-btn key="customerMainView" :color="customerStore.form.disabled || mainStore.mode.value === mainStore.mode.options.NEW ? 'primary' : 'red'"
               @click="goTo('#customerMainView')" icon="">
            <v-icon>mdi-account</v-icon>
            <v-tooltip activator="parent" location="start">Basic Information</v-tooltip>
        </v-btn>

        <v-btn key="lpoValidationProcess" v-if="mainStore.mode.value === mainStore.mode.options.CALL_CENTER"
               :color="lpoCampaign.formDisabled ? 'primary' : 'red'" icon=""
               @click="goTo('#lpoValidationProcess')">
            <v-icon>mdi-text-account</v-icon>
            <v-tooltip activator="parent" location="start">LPO Validation</v-tooltip>
        </v-btn>

        <v-btn key="businessPhotoView" v-if="mainStore.mode.value === mainStore.mode.options.CALL_CENTER"
               icon="" color="primary" @click="goTo('#businessPhotoView')">
            <v-icon>mdi-image-multiple</v-icon>
            <v-tooltip activator="parent" location="start">Photos of the Business</v-tooltip>
        </v-btn>

        <v-btn key="addressMainView" icon="" color="primary" @click="goTo('#addressMainView')">
            <v-icon>mdi-map-marker</v-icon>
            <v-tooltip activator="parent" location="start">Addresses</v-tooltip>
        </v-btn>

        <v-btn key="contactMainView" icon="" color="primary" @click="goTo('#contactMainView')">
            <v-icon>mdi-card-account-details</v-icon>
            <v-tooltip activator="parent" location="start">Contacts</v-tooltip>
        </v-btn>

        <v-btn key="saveNewLeadButtonContainer" icon="" color="green" v-if="mainStore.mode.value === mainStore.mode.options.NEW"
               @click="goTo('#saveNewLeadButtonContainer')">
            <v-icon>mdi-content-save-all-outline</v-icon>
            <v-tooltip activator="parent" location="start">Save New Lead</v-tooltip>
        </v-btn>

        <v-btn key="extraInfoView" icon="" color="primary" v-if="mainStore.mode.value !== mainStore.mode.options.NEW"
               @click="goTo('#extraInfoView')">
            <v-icon>mdi-information-variant</v-icon>
            <v-tooltip activator="parent" location="start">Additional Information</v-tooltip>
        </v-btn>

        <v-btn key="callCenterView" icon="" color="primary" v-if="mainStore.mode.value === mainStore.mode.options.CALL_CENTER"
               @click="goTo('#callCenterView')">
            <v-icon>mdi-phone</v-icon>
            <v-tooltip activator="parent" location="start">Call Centre</v-tooltip>
        </v-btn>
    </v-speed-dial>

    <v-btn style="position: fixed; left: 10px; bottom: 10px;" color="pink" class="text-none px-2" title="Back to NetSuite Record Page"
           v-if="mainStore.mode.value !== mainStore.mode.options.NEW"
           :icon="mdAndDown" @click="useCustomerStore().goToRecordPage()">
        <v-icon>mdi-chevron-left</v-icon> {{ mdAndDown ? '' : `Customer's Record` }}
    </v-btn>
</template>

<style scoped>

</style>