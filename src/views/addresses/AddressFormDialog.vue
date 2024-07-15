<script setup>
import { useAddressesStore } from '@/stores/addresses';
import AddressForm from "@/views/addresses/AddressForm.vue";
import { computed, ref } from "vue";
import { useDisplay } from "vuetify";

const {md, lg, smAndDown} = useDisplay();
const addressStore = useAddressesStore();
const addressForm = ref(null);
const dialogWidth = computed(() => {
    if (smAndDown.value)
        return '95vw';
    else if (md.value)
        return '75vw';
    else if (lg.value)
        return '60vw';
    else
        return '40vw';
})

async function save() {
    if (!await addressForm.value.saveAddress()) return false;
    addressStore.dialog.open = false;
}
</script>

<template>
    <v-dialog :width="dialogWidth" v-model="addressStore.dialog.open" :eager="true">

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