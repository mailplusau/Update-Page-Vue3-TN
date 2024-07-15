<script setup>
import CustomerMainView from '@/views/customer/Main.vue';
import AddressMainView from '@/views/addresses/Main.vue';
</script>

<template>
    <v-container fluid>
        <v-row justify="center">
            <v-col xl="9" lg="10" md="11" cols="12">
                <CustomerMainView />

                <AddressMainView />
            </v-col>
        </v-row>
    </v-container>
</template>

<style scoped>

</style>