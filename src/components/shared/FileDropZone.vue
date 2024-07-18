<script setup>
import {ref, defineModel, computed} from "vue";

const mainDropZone = ref();
const fileInputElement = ref();
const isDragging = ref(false);
const removalDialogOpen = ref(false);
const previewDialog = ref({
    img: '',
    open: false,
})
const files = defineModel({
    required: true,
});

const props = defineProps({
    message: {
        type: String,
        default: ''
    },
    disabled: {
        type: Boolean,
        default: false,
    }
})

const filePreviews = computed(() => files.value.map(file => ({
    name: file['name'],
    size: file['size'],
    preview: generateURL(file)
})))

function previewFile(index) {
    let fileSrc = URL.createObjectURL(files.value[index]);
    setTimeout(() => {
        URL.revokeObjectURL(fileSrc);
    }, 1000);
    previewDialog.value.img = fileSrc;
    previewDialog.value.open = true;
}

function closePreviewDialog() {
    previewDialog.value.img = null;
    previewDialog.value.open = false;
}

function openFileDialog() {
    if (props.disabled) return;
    fileInputElement.value.click();
}

function removeAllFiles() {
    files.value.splice(0);
    removalDialogOpen.value = false;
}

function onChange() {
    [...fileInputElement.value.files].forEach(file => {
        if (!(/\.(gif|jpe?g|tiff|png|bmp)$/i).test(file.name)) return;

        if (file.size > 1024*10240) return;

        let index = files.value.findIndex(item => item.name === file.name && item.size === file.size);
        if (index < 0) files.value.push(file);
    })
}

function generateURL(file) {
    let fileSrc = URL.createObjectURL(file);
    setTimeout(() => {
        URL.revokeObjectURL(fileSrc);
    }, 1000);
    return fileSrc;
}

const handleEvent = {
    dragover(e) {
        e.preventDefault();
        if (props.disabled) return;
        isDragging.value = true;
    },
    dragleave(e) {
        if (mainDropZone.value.$el.contains(e['fromElement'])) return;
        isDragging.value = false;
    },
    drop(e) {
        if (props.disabled) return;
        e.preventDefault();
        fileInputElement.value.files = e.dataTransfer.files;
        onChange();
        isDragging.value = false;
    },
    remove(i) {
        files.value.splice(i, 1);
    }
}
</script>

<template>
    <v-container class="pa-0" @dragover="handleEvent.dragover" @dragleave="handleEvent.dragleave" @drop="handleEvent.drop" ref="mainDropZone">
        <v-row no-gutters>
            <v-col cols="12">
                <v-toolbar density="compact" color="primary" dark>
                    <h2 class="mx-4 font-weight-regular">Photos of the business</h2>
                    <v-divider vertical></v-divider>
                    <span class="mx-4 text-caption text-secondary">{{ props.message }}</span>

                    <v-spacer></v-spacer>

                    <v-btn v-show="files.length" color="red" class="mr-2" size="small" variant="elevated" @click="removalDialogOpen = true">remove all</v-btn>
                    <v-btn color="green" size="small" class="mr-2" variant="elevated" @click="openFileDialog">browse for files</v-btn>
                </v-toolbar>
                <v-card min-height="200px" class="bg-background main" elevation="5">
                    <v-container fluid v-if="files.length">
                        <v-row align="center">
                            <v-col v-for="(file, index) in filePreviews" :key="file.name" lg="3" md="3" sm="4" cols="12">
                                <v-card class="mx-auto fill-height" @click.stop="previewFile(index)" elevation="4">
                                    <v-img height="250" :src="file.preview" class="white--text align-end"
                                           :gradient="'to bottom, rgba(0,0,0,0), rgba(0,0,0,.7)'">
                                        <v-btn color="red" size="x-small" icon="mdi-close" class="image-delete-btn" variant="outlined"
                                               @click.stop="handleEvent.remove(index)" dark>
                                        </v-btn>
                                        <v-card-title class="py-2 text-caption text-white">{{ file.name }}</v-card-title>
                                    </v-img>
                                </v-card>
                            </v-col>
                        </v-row>
                    </v-container>
                    <v-container v-else fluid style="min-height: 200px" class="fill-height">
                        <v-row justify="center" align="center" no-gutters>
                            <v-col cols="auto">
                                <v-icon size="50">mdi-cloud-upload-outline</v-icon>
                            </v-col>
                            <v-col cols="12" class="text-center subtitle-1">
                                <span>...or drop them here to upload.</span>
                            </v-col>
                        </v-row>
                    </v-container>

                    <div :class="'dropzone-container ' + (isDragging ? '' : 'dropzone-container-hide')" @dragover="handleEvent.dragover">
                        <input type="file" name="file"
                               id="fileInput" style="visibility: hidden;"
                               @change="onChange"
                               ref="fileInputElement"
                               accept=".jpg,.jpeg,.png,.bmp,.gif,.tiff"/>

                        <label for="fileInput" class="file-label">
                            <span v-if="isDragging">Release to drop files here.</span>
                        </label>
                    </div>
                </v-card>
            </v-col>
        </v-row>


        <v-dialog v-model="removalDialogOpen" max-width="350">
            <v-card class="bg-background">
                <v-card-title class="text-h6">
                    Remove all files?
                </v-card-title>

                <v-card-text class="subtitle-1">
                    You are about to remove {{files.length}} pending files. This is irreversible. Are you sure?
                </v-card-text>

                <v-divider></v-divider>
                <v-card-actions>
                    <v-btn color="red darken-1" variant="text" @click="removeAllFiles">
                        remove all
                    </v-btn>
                    <v-spacer></v-spacer>
                    <v-btn color="green darken-1" variant="text" @click="removalDialogOpen = false">
                        Cancel
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>


        <v-dialog
            v-model="previewDialog.open"
            fullscreen
            hide-overlay
            scrollable
            transition="dialog-bottom-transition"
        >
            <v-card class="bg-primary">
                <v-toolbar dark color="primary">
                    <v-toolbar-title>
                        Previewing Image
                    </v-toolbar-title>
                    <v-spacer></v-spacer>
                    <v-toolbar-items>
                        <v-btn color="yellow" variant="text" @click="closePreviewDialog">
                            Done & close
                        </v-btn>
                    </v-toolbar-items>
                </v-toolbar>

                <v-divider></v-divider>

                <v-img v-if="previewDialog.img && previewDialog.open" :src="previewDialog.img"></v-img>
            </v-card>
        </v-dialog>
    </v-container>
</template>

<style scoped>
.main {
    position: relative;
}
.dropzone-container-hide {
    opacity: 0 !important;
}
.dropzone-container {
    opacity: 0.8;
    pointer-events: none;
    padding: 4rem;
    background: #f7fafc;border: 3px dashed black;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-content: center;
    justify-content: center;
    flex-direction: column;
    flex-wrap: wrap;
    z-index: 2
}

.hidden-input {
    opacity: 0;
    overflow: hidden;
    position: absolute;
    width: 1px;
    height: 1px;
}
.file-label {
    font-size: 20px;
    cursor: pointer;
}
.image-delete-btn {
    position: absolute;
    top: 10px;
    right: 10px;
}
</style>