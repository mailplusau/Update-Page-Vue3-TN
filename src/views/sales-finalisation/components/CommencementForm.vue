<script setup>
import {computed, ref} from 'vue';
import {useCRStore} from '@/stores/comm-reg';
import {formatBytes} from '@/utils/utils.mjs';

const commRegStore = useCRStore();
const mainDropZone = ref();
const fileInputElement = ref();
const isDragging = ref(false);
const previewDialog = ref(false);

const filename = computed(() => commRegStore.form.attachedFile?.name || commRegStore.form.data.custrecord_scand_form || null);
const fileSize = computed(() =>
    (commRegStore.form.attachedFile?.size ? 'File size: ' + formatBytes(commRegStore.form.attachedFile.size) : null) ||
    (commRegStore.form.data.custrecord_scand_form ? 'File uploaded to NetSuite' : null));

function onChange() {
    if (!fileInputElement.value.files.length) return;
    if (!/(\.pdf)$/gi.test(fileInputElement.value.files[0].name)) return;

    commRegStore.form.attachedFile = fileInputElement.value.files[0];
    fileInputElement.value.value = null;
}

async function previewFile() {
    await commRegStore.generatePreviewUrl();
    previewDialog.value = true;
}

const handleEvent = {
    dragover(e) {
        e.preventDefault();
        isDragging.value = true;
    },
    dragleave(e) {
        if (mainDropZone.value.$el.contains(e['fromElement'])) return;
        isDragging.value = false;
    },
    drop(e) {
        e.preventDefault();
        fileInputElement.value.files = e.dataTransfer.files;
        onChange();
        isDragging.value = false;
    },
    remove() {
        console.log('remove')
        commRegStore.form.attachedFile = null
    }
}
</script>

<template>
    <v-card elevation="5" color="background" class="text-center"
            @dragover="handleEvent.dragover" @dragleave="handleEvent.dragleave" @drop="handleEvent.drop" ref="mainDropZone">
        <v-img v-if="isDragging" height="300" class="text-white align-center"
               :gradient="'to bottom, rgba(0,0,0,0), rgba(0,0,0,.7), rgba(0,0,0,0)'">
            Drop file here
        </v-img>
        <v-img v-else height="300" :class="`align-center ${filename ? 'text-primary' : 'text-grey'}`">
            <v-icon size="100">{{filename ? 'mdi-file-check-outline' : 'mdi-file-cancel-outline'}}</v-icon>
            <v-card-title class="py-2 text-caption font-weight-bold">{{ filename || 'Commencement Form' }}</v-card-title>

            <v-btn color="primary" size="x-small" icon="mdi-folder" class="mx-1" variant="outlined" @click="fileInputElement.click()"></v-btn>
            <v-btn color="green" size="x-small" icon="mdi-eye" class="mx-1" variant="outlined" :disabled="!filename" @click="previewFile()"></v-btn>
            <v-btn color="red" size="x-small" icon="mdi-close" class="mx-1" variant="outlined" :disabled="!filename" @click="handleEvent.remove()"></v-btn>
        </v-img>

        <div :class="`text-caption ${fileSize ? 'text-primary' : 'text-red-darken-2'}`">
            {{ fileSize || 'Please attach a commencement form.'}}
        </div>

        <input type="file" name="file" :multiple="false"
               id="fileInput" style="visibility: hidden; position: absolute; top: 0; left: 0;"
               @change="onChange" accept=".pdf"
               ref="fileInputElement"/>

        <v-dialog v-model="previewDialog"
            fullscreen hide-overlay scrollable transition="dialog-bottom-transition">
            <v-card class="bg-primary">
                <v-toolbar dark color="primary">
                    <v-toolbar-title>
                        Previewing File
                    </v-toolbar-title>
                    <v-spacer></v-spacer>
                    <v-toolbar-items>
                        <v-btn color="yellow" variant="text" @click="previewDialog = false">
                            Done & close
                        </v-btn>
                    </v-toolbar-items>
                </v-toolbar>

                <v-divider></v-divider>

                <object v-if="commRegStore.form.attachedFilePreview" class="webview-iframe"
                        type="application/pdf" :data="commRegStore.form.attachedFilePreview"></object>
            </v-card>
        </v-dialog>
    </v-card>
</template>

<style scoped>
.webview-iframe {
    height: 100%;
    width: 100%;
    border: none;
    overflow: scroll;
}
</style>