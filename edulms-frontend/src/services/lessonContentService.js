import axiosClient from "../api/axiosClient";

const lessonContentService = {
  // Get all lesson contents or filter by teachingAssignmentRef, contentType
  getLessonContents: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await axiosClient.get(`/lesson-contents${query ? `?${query}` : ""}`);
  },

  // Get lesson contents by class and subject
  getLessonContentsByClassAndSubject: async (classId, subjectId) => {
    return await axiosClient.get(
      `/lesson-contents/class-subject?classId=${classId}&subjectId=${subjectId}`
    );
  },

  // Get single lesson content by ID
  getLessonContentById: async (id) => {
    return await axiosClient.get(`/lesson-contents/${id}`);
  },

  // Create new lesson content
  createLessonContent: async (data) => {
    return await axiosClient.post("/lesson-contents", data);
  },

  // Update lesson content
  updateLessonContent: async (id, data) => {
    return await axiosClient.put(`/lesson-contents/${id}`, data);
  },

  // Delete lesson content
  deleteLessonContent: async (id) => {
    return await axiosClient.delete(`/lesson-contents/${id}`);
  },

  // Bulk reorder lesson contents
  reorderLessonContents: async (items) => {
    return await axiosClient.put("/lesson-contents/reorder", { items });
  },

  // Upload file (media, document, video) with progress callback
  uploadMedia: async (file, onProgress) => {
    const formData = new FormData();
    formData.append("file", file);

    return await axiosClient.post("/upload/media", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted, progressEvent.loaded, progressEvent.total);
        }
      },
    });
  },
};

export default lessonContentService;
