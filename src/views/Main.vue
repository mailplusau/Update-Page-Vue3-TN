<script setup>
import CustomerMainView from '@/views/customer/Main.vue';
import AddressMainView from '@/views/addresses/Main.vue';
import ContactMainView from '@/views/contacts/Main.vue';
import {useGoTo} from 'vuetify';

const goTo = useGoTo();
</script>

<template>
    <v-container fluid>
        <v-row justify="center">
            <v-col xl="9" lg="10" md="11" cols="12">
                <CustomerMainView id="customerMainView" />

                <AddressMainView id="addressMainView" />

                <ContactMainView id="contactMainView"/>
            </v-col>
        </v-row>

        <v-speed-dial transition="fade-transition" location-strategy="connected" location="right bottom"
                      :model-value="true"
                      :close-on-content-click="false"
                      :close-on-back="false"
                      persistent>
            <template v-slot:activator="{ props: activatorProps }">
                <v-fab absolute disabled style="opacity: 0" v-bind="activatorProps"></v-fab>
            </template>

            <v-btn key="1" icon="" color="primary" @click="goTo('#customerMainView')">
                <v-icon>mdi-account</v-icon>
                <v-tooltip activator="parent" location="start">Basic Information</v-tooltip>
            </v-btn>

            <v-btn key="2" icon="" color="primary" @click="goTo('#addressMainView')">
                <v-icon>mdi-map-marker</v-icon>
                <v-tooltip activator="parent" location="start">Addresses</v-tooltip>
            </v-btn>

            <v-btn key="3" icon="" color="primary" @click="goTo('#contactMainView')">
                <v-icon>mdi-contacts-outline</v-icon>
                <v-tooltip activator="parent" location="start">Contacts</v-tooltip>
            </v-btn>

            <v-btn key="4" icon="" color="primary">
                <v-icon>mdi-account</v-icon>
                <v-tooltip activator="parent" location="start">Addresses</v-tooltip>
            </v-btn>
        </v-speed-dial>
    </v-container>
</template>

<style scoped>

</style>