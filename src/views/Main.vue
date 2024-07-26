<script setup>
import CustomerMainView from '@/views/customer/Main.vue';
import AddressMainView from '@/views/addresses/Main.vue';
import ContactMainView from '@/views/contacts/Main.vue';
import ExtraInfoView from '@/views/extra-info/Main.vue';
import CallCenterView from '@/views/call-center/Main.vue';
import {useMainStore} from '@/stores/main';
import SpeedDial from '@/views/layout/SpeedDial.vue';

const mainStore = useMainStore();
</script>

<template>
    <v-container fluid>
        <v-row justify="center">
            <v-col xl="5" lg="8" md="10" cols="12">
                <CustomerMainView id="customerMainView" />

                <AddressMainView id="addressMainView" />

                <ContactMainView id="contactMainView"/>

                <v-container id="saveNewLeadButtonContainer" v-if="mainStore.mode.value === mainStore.mode.options.NEW"></v-container>

                <ExtraInfoView id="extraInfoView" />

            </v-col>
        </v-row>
        <v-row justify="center">
            <v-col cols="12">
                <CallCenterView id="callCenterView" />
            </v-col>
        </v-row>

        <SpeedDial />
    </v-container>
</template>

<style scoped>

</style>