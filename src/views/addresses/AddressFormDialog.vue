<script setup>
import { useAddressesStore } from '@/stores/addresses';
import AddressForm from "@/views/addresses/AddressForm.vue";
import { ref } from "vue";
import { useDisplay } from "vuetify";
import {getDialogWidth} from '@/utils/utils.mjs';

const addressStore = useAddressesStore();
const addressForm = ref(null);

async function save() {
    if (!await addressForm.value.saveAddress()) return false;
    addressStore.dialog.open = false;
}
</script>

<template>
    <v-dialog :width="getDialogWidth(useDisplay())" v-model="addressStore.dialog.open" :eager="true">
        <template v-slot:default="{ isActive }">
            <v-card class="bg-background">
                <AddressForm ref="addressForm" />

                <v-card-actions class="pb-5">
                    <v-spacer></v-spacer>

                    <v-btn color="red darken-1" dark variant="elevated" class="mx-3" @click="isActive.value = false">
                        Cancel
                    </v-btn>

                    <v-btn color="green darken-1" variant="elevated" dark class="mx-3" @click="save">
                        Save Address
                    </v-btn>

                    <v-spacer></v-spacer>
                </v-card-actions>
            </v-card>
        </template>
    </v-dialog>
</template>

<style scoped>

</style>