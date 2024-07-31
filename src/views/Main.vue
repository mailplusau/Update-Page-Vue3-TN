<script setup>
import CustomerMainView from '@/views/customer/Main.vue';
import AddressMainView from '@/views/addresses/Main.vue';
import ContactMainView from '@/views/contacts/Main.vue';
import ExtraInfoView from '@/views/extra-info/Main.vue';
import CallCenterView from '@/views/call-center/Main.vue';
import SpeedDial from '@/views/layout/SpeedDial.vue';
import LpoValidationProcess from '@/views/lpo-campaign/validation-process/Main.vue';
import BusinessPhotoView from '@/views/customer/business-photos/Main.vue';
import SalesFinalisationView from '@/views/sales-finalisation/Main.vue';
import ServiceChangeView from '@/views/service-changes/Main.vue';
import ActivityNoteView from '@/views/sales-activities/Main.vue';
import InvoiceView from '@/views/invoices/Main.vue';
import {useMainStore} from '@/stores/main';

const mainStore = useMainStore();
</script>

<template>
    <v-container fluid>
        <v-row justify="center">
            <v-col xl="5" lg="8" md="10" cols="12">
                <CustomerMainView id="customerMainView" />

                <LpoValidationProcess id="lpoValidationProcess" />

                <BusinessPhotoView id="businessPhotoView" />

                <AddressMainView id="addressMainView" />

                <ContactMainView id="contactMainView"/>

                <ExtraInfoView id="extraInfoView" />

                <ActivityNoteView id="activityNoteView" />

                <InvoiceView id="invoiceView" />

                <ServiceChangeView id="serviceChangeView" />

                <v-container id="saveNewLeadButtonContainer" v-show="mainStore.mode.value === mainStore.mode.options.NEW"></v-container>

                <SalesFinalisationView id="salesFinalisationView" />
            </v-col>
        </v-row>

        <v-row justify="center">
            <v-col xl="8" lg="10" md="12" cols="12">
                <CallCenterView id="callCenterView" />
            </v-col>
        </v-row>

        <SpeedDial />
    </v-container>
</template>

<style scoped>

</style>