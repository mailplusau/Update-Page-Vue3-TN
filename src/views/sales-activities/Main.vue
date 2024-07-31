<script setup>
import {computed, ref} from 'vue';
import {useActivityNotesStore} from '@/stores/activity-notes';
import {useMiscStore} from '@/stores/misc';
import {rules} from '@/utils/utils.mjs';
import {useEmployeeStore} from '@/stores/employees';
import {useMainStore} from '@/stores/main';

const { validate } = rules;
const mainStore = useMainStore();
const noteStore = useActivityNotesStore();
const miscStore = useMiscStore();
const employeeStore = useEmployeeStore();
const userNoteForm = ref();

const headers = computed(() => [
    { key: 'date', title: 'Date', align: 'start' },
    { key: 'organizer', title: 'Organizer', align: 'center', sortable: false },
    { key: 'type', title: 'Type', align: 'center', sortable: false },
    { key: 'title', title: 'Title', align: 'center', sortable: false },
    { key: 'note', title: 'Message', align: 'center', sortable: false },
]);

const tableData = computed(() => [
    ...noteStore.userNotes.data.map(item => ({
        date: item['notedate'],
        organizer: item['author_text'],
        type: item['notetype'],
        title: item['title'],
        note: item['note'],
    })),
    ...noteStore.salesActivities.data.map(item => ({
        date: item['createddate'],
        organizer: item['custevent_organiser_text'],
        type: 'Activity - ' + item['type'],
        title: item['title'],
        note: item['message'],
    })),
]);

async function save() {
    const { valid } = await userNoteForm.value['validate']();
    if (!valid) return false;

    noteStore.saveUserNote().then();
}
</script>

<template>
    <v-container v-if="[mainStore.mode.options.CALL_CENTER, mainStore.mode.options.UPDATE].includes(mainStore.mode.value)">
        <v-row justify="center">
            <v-col cols="12">
                <v-data-table
                    :headers="headers"
                    :items="tableData"
                    :loading="noteStore.userNotes.busy || noteStore.salesActivities.busy"
                    no-data-text="No Activity to Show"
                    :items-per-page="-1"
                    class="elevation-5 bg-background"
                    :hide-default-footer="tableData.length <= 10"
                    loading-text="Loading activity notes..."
                    :cell-props="{ class: 'cell-text-size-11px' }"
                >
                    <template v-slot:top>
                        <v-toolbar density="compact" color="primary">
                            <h2 class="mx-4 font-weight-regular">Sales Activities</h2>
                            <v-divider vertical></v-divider>
                            <span class="mx-4 text-caption text-secondary"></span>

                            <v-spacer></v-spacer>

                            <v-btn variant="elevated" color="green" class="mr-2" size="small" @click="noteStore.openUserNoteDialog()">
                                Create User Note
                            </v-btn>
                        </v-toolbar>
                    </template>

                </v-data-table>
            </v-col>
        </v-row>

        <v-dialog width="750" v-model="noteStore.userNotes.crudDialogOpen">
            <v-card color="background">
                <v-form ref="userNoteForm" class="v-container v-container--fluid">
                    <v-row justify="center" >
                        <v-col cols="12"><p class="text-h5 text-center">Create User Note</p></v-col>

                        <v-col cols="7">
                            <v-row>
                                <v-col cols="12">
                                    <v-text-field label="Title" density="compact" variant="outlined" color="primary"
                                                  v-model="noteStore.userNotes.form.title"
                                                  :rules="[v => validate(v, 'required')]"></v-text-field>
                                </v-col>

                                <v-col cols="12">
                                    <v-autocomplete label="Author" density="compact" variant="outlined" color="primary"
                                                    v-model="noteStore.userNotes.form.author"
                                                    :items="employeeStore.data" readonly
                                                    item-value="internalid" item-title="entityid"
                                                    :rules="[v => validate(v, 'required')]"></v-autocomplete>
                                </v-col>

                                <v-col cols="5">
                                    <v-autocomplete label="Direction" density="compact" variant="outlined" color="primary"
                                                    v-model="noteStore.userNotes.form.direction"
                                                    :rules="[v => validate(v, 'required')]"
                                                    :items="miscStore.userNoteDirections"></v-autocomplete>
                                </v-col>

                                <v-col cols="7">
                                    <v-autocomplete label="Note Type" density="compact" variant="outlined" color="primary"
                                                    v-model="noteStore.userNotes.form.notetype"
                                                    :rules="[v => validate(v, 'required')]"
                                                    :items="miscStore.userNoteTypes"></v-autocomplete>
                                </v-col>
                            </v-row>
                        </v-col>
                        <v-col cols="5">
                            <v-row>
                                <v-col cols="12">
                                    <v-textarea label="Note" density="compact" variant="outlined" color="primary" rows="8" no-resize
                                                v-model="noteStore.userNotes.form.note"
                                                :rules="[v => validate(v, 'required')]"></v-textarea>
                                </v-col>
                            </v-row>
                        </v-col>
                    </v-row>
                    <v-row justify="center">
                        <v-col cols="auto">
                            <v-btn @click="noteStore.userNotes.crudDialogOpen = false">Cancel</v-btn>
                        </v-col>
                        <v-col cols="auto">
                            <v-btn variant="elevated" color="green" @click="save()">Save Note</v-btn>
                        </v-col>
                    </v-row>
                </v-form>
            </v-card>
        </v-dialog>
    </v-container>
</template>

<style scoped>

</style>