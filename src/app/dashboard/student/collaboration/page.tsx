'use client';

import { useCollaboration } from '@/lib/utils/useCollaboration';
import BoardList from '@/components/collaboration/BoardList';
import BoardView from '@/components/collaboration/BoardView';

export default function CollaborationPage() {
  const {
    // State
    boards,
    selectedBoard,
    setSelectedBoard,
    currentUser,
    pendingInvites,
    editingCard,
    setEditingCard,
    members,
    previewImage,
    setPreviewImage,
    inviteEmail,
    setInviteEmail,
    searchResults,
    isSearching,
    alert,
    setAlert,
    deleteModal,
    openDeleteModal,
    closeDeleteModal,
    fileInputRef,

    // Actions
    createBoard,
    handleDeleteBoard,
    acceptInvite,
    addColumn,
    renameColumn,
    deleteColumn,
    onColumnDrop,
    addCard,
    openCardForEdit,
    saveCard,
    deleteCard,
    moveCard,
    searchUsersByEmail,
    inviteUser,
    handleFileUpload,
    deleteAttachment,
  } = useCollaboration();

  // Show board list if no board is selected
  if (!selectedBoard) {
    return (
      <BoardList
        boards={boards}
        pendingInvites={pendingInvites}
        currentUser={currentUser}
        onSelectBoard={setSelectedBoard}
        handleDeleteBoard={handleDeleteBoard}
        createBoard={createBoard}
        acceptInvite={acceptInvite}
        alert={alert}
        setAlert={setAlert}
        deleteModal={deleteModal}
        openDeleteModal={openDeleteModal}
        closeDeleteModal={closeDeleteModal}
      />
    );
  }

  // Show the full Kanban board view
  return (
    <BoardView
      board={selectedBoard}
      onBack={() => setSelectedBoard(null)}
      // Column operations
      addColumn={addColumn}
      renameColumn={renameColumn}
      deleteColumn={deleteColumn}
      onColumnDrop={onColumnDrop}
      // Card operations
      addCard={addCard}
      openCardForEdit={openCardForEdit}
      moveCard={moveCard}
      // Card modal
      editingCard={editingCard}
      setEditingCard={setEditingCard}
      saveCard={saveCard}
      deleteCard={deleteCard}
      // Invite modal
      members={members}
      inviteEmail={inviteEmail}
      setInviteEmail={setInviteEmail}
      searchResults={searchResults}
      isSearching={isSearching}
      searchUsersByEmail={searchUsersByEmail}
      inviteUser={inviteUser}
      // Attachments & preview
      fileInputRef={fileInputRef as React.RefObject<HTMLInputElement>}
      handleFileUpload={handleFileUpload}
      previewImage={previewImage}
      setPreviewImage={setPreviewImage}
      deleteAttachment={deleteAttachment}
      // Shared modals
      alert={alert}
      setAlert={setAlert}
      deleteModal={deleteModal}
      openDeleteModal={openDeleteModal}
      closeDeleteModal={closeDeleteModal}
      currentUserId={currentUser?.id}
    />
  );
}