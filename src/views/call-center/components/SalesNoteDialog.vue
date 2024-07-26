<script setup>
import {useCallCenter} from '@/stores/call-center';
import {useMiscStore} from '@/stores/misc';
import {ref} from 'vue';
import {rules} from '@/utils/utils.mjs';

const callCenter = useCallCenter();
const miscStore = useMiscStore();

const { validate } = rules;
const mainForm = ref(null);
const formValid = ref(true);

async function callPendingAction() {
    let res = await mainForm.value.validate();
    if (!res.valid) return;

    callCenter.salesNoteDialog.pendingAction()
    callCenter.salesNoteDialog.open = false;
}
</script>

<template>
    <v-dialog v-model="callCenter.salesNoteDialog.open" width="500" >
        <v-card :title="callCenter.salesNoteDialog.title" :subtitle="callCenter.salesNoteDialog.subtitle" color="background">
            <v-form ref="mainForm" v-model="formValid" lazy-validation>
                <v-textarea prefix="Sales Note:" variant="outlined" density="compact" color="primary"
                            v-model="callCenter.salesNoteDialog.note" persistent-placeholder
                            class="mx-4" rows="3" placeholder="(optional)"></v-textarea>

                <v-autocomplete v-if="callCenter.salesNoteDialog.needParkingLotReason"
                                :rules="[v => validate(v, 'required')]"
                                prefix="Reason:" persistent-placeholder variant="outlined" density="compact" color="primary" class="mx-4 mb-3"
                                v-model="callCenter.salesNoteDialog.reasonId" :items="miscStore.parkingLotReasons"></v-autocomplete>
            </v-form>

            <v-card-actions class="mb-2">
                <v-spacer></v-spacer>
                <v-btn @click="callCenter.salesNoteDialog.open = false" color="red">Cancel</v-btn>
                <v-btn @click="callPendingAction" color="green" variant="elevated">Proceed</v-btn>
                <v-spacer></v-spacer>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<style scoped>

</style>