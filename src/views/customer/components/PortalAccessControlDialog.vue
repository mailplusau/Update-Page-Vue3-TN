<script setup>
import {computed, ref} from "vue";
import {useCustomerStore} from '@/stores/customer';

const customerStore = useCustomerStore();

const dialogOpen = ref(false);
const notes = ref('');

const hasPortalAccess = computed(() => {
    return parseInt(customerStore.form.data['custentity_portal_access']) !== 2;
});

function changePortalAccess(changeNotesOnly = false) {
    customerStore.changePortalAccess(notes.value, changeNotesOnly);
    dialogOpen.value = false;
    notes.value = '';
}
</script>

<template>
    <v-dialog width="450" v-model="dialogOpen">
        <template v-slot:activator="{ props: activatorProps }">
            <slot name="activator" :activatorProps="activatorProps" :hasPortalAccess="hasPortalAccess"></slot>
        </template>


        <v-card class="bg-background">
            <v-container>
                <v-row justify="center" align="center">
                    <v-col cols="12" class="text-center text-h6">Changing Portal Access</v-col>

                    <v-col cols="auto" class="text-h5" v-if="hasPortalAccess">
                        <b class="text-green">YES</b>
                        <v-icon class="mx-1" color="primary">mdi-arrow-right-thin</v-icon>
                        <b class="text-red">NO</b>
                    </v-col>
                    <v-col cols="auto" class="text-h5" v-else>
                        <b class="text-red">NO</b>
                        <v-icon class="mx-1" color="primary">mdi-arrow-right-thin</v-icon>
                        <b class="text-green">YES</b>
                    </v-col>

                    <v-col cols="12">
                        <v-textarea label="Notes for this change:" variant="outlined" density="compact" hide-details rows="3" color="primary"
                                    placeholder="(optional)"
                                    v-model="notes"></v-textarea>
                    </v-col>

<!--                    <v-col cols="12" class="text-center">-->
<!--                        <v-btn size="small" class="text-none" color="grey" dark @click="changePortalAccess(true)">Save notes without changing Portal Access</v-btn>-->
<!--                    </v-col>-->

                    <v-col cols="auto">
                        <v-btn @click="dialogOpen = false" variant="outlined">Cancel</v-btn>
                    </v-col>

                    <v-col cols="auto">
                        <v-btn :color="hasPortalAccess ? 'red' : 'green'" dark class="text-none" @click="changePortalAccess(false)">
                            Change Portal Access to {{hasPortalAccess ? 'NO' : 'YES'}}
                        </v-btn>
                    </v-col>
                </v-row>
            </v-container>
        </v-card>
    </v-dialog>
</template>

<style scoped>

</style>