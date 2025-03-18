<template>
    <div class="thumbnail" @mouseover="handleMouseOver">
      <img :src="image" alt="Thumbnail Image" />
    </div>
  </template>
  
  <script>
  export default {
    name: 'ImageThumbnail',
    props: {
      image: String,
      id: String
    },
    methods: {
      handleMouseOver() {
        this.$emit('mouseover', this.image);
      }
    }
  };
  </script>
  
  <style scoped>
  .thumbnail {
    display: inline-block;
    margin-right: 10px;
  }
  img {
    max-width: 100px;
    height: auto;
  }
  </style>