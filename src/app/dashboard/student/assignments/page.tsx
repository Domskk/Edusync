"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import {
  PlusIcon,
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  CalendarIcon,
  BellIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { differenceInDays, format, isPast, isToday, isTomorrow } from "date-fns";

interface Assignment {
  id: string;
  title: string;
  subject: string | null;
  due_date: string;
  description: string | null;
  is_completed: boolean;
}

export default function AssignmentsPage() {
  const router = useRouter();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Assignment | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationsEnabled(Notification.permission === "granted");
    }
  }, []);


  const [form, setForm] = useState({
    id: "",
    title: "",
    subject: "",
    due_date: "",
    description: "",
  });

  // --------------------------
  // LOAD ASSIGNMENTS
  // --------------------------
  async function loadAssignments() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data, error } = await supabase
      .from("assignments")
      .select("*")
      .eq("user_id", user.id)
      .order("due_date", { ascending: true });

    if (error) console.error("Error loading assignments:", error);

    setAssignments(data || []);
    checkUpcomingDeadlines(data || []);
  }

  // --------------------------
  // LOCAL NOTIFICATION REMINDER
  // --------------------------
  const checkUpcomingDeadlines = useCallback((list: Assignment[]) => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;


    list.forEach((a) => {
      if (a.is_completed) return;

      const days = differenceInDays(new Date(a.due_date), new Date());

      if (days === 0) {
        new Notification("Assignment Due TODAY", {
          body: `📅 ${a.title} is due today.`,
          icon: "/icon.svg",
        });
      } else if (days === 1) {
        new Notification("Assignment Due Tomorrow", {
          body: `⚠️ ${a.title} is due tomorrow.`,
          icon: "/icon.svg",
        });
      }
    });
  }, []);

  // --------------------------
  // ENABLE BROWSER NOTIFICATIONS ONLY
  // --------------------------
  const enableNotifications = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setNotificationsEnabled(true);
      alert("✅ Reminders enabled! You will get daily assignment alerts.");
    } else {
      alert("❌ Notifications blocked. Enable them in browser settings.");
    }
  };

  // --------------------------
  // LOAD ON MOUNT
  // --------------------------
  useEffect(() => {
    loadAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --------------------------
  // SAVE (CREATE/UPDATE)
  // --------------------------
  async function saveAssignment() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    if (editing) {
      await supabase
        .from("assignments")
        .update({
          title: form.title,
          subject: form.subject || null,
          due_date: form.due_date,
          description: form.description || null,
        })
        .eq("id", editing.id)
        .eq("user_id", user.id);
    } else {
      await supabase.from("assignments").insert({
        user_id: user.id,
        title: form.title,
        subject: form.subject || null,
        due_date: form.due_date,
        description: form.description || null,
        is_completed: false,
      });
    }

    setShowModal(false);
    setEditing(null);
    setForm({
      id: "",
      title: "",
      subject: "",
      due_date: "",
      description: "",
    });

    loadAssignments();
  }

  // --------------------------
  // TOGGLE COMPLETE
  // --------------------------
  async function toggleComplete(a: Assignment) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("assignments")
      .update({ is_completed: !a.is_completed })
      .eq("id", a.id)
      .eq("user_id", user.id);

    loadAssignments();
  }

  // --------------------------
  // DELETE
  // --------------------------
  async function deleteAssignment(id: string) {
    if (!confirm("Delete this assignment?")) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("assignments").delete().eq("id", id).eq("user_id", user.id);

    loadAssignments();
  }

  // --------------------------
  // URGENCY BADGES
  // --------------------------
  const getUrgencyBadge = (due: string, completed: boolean) => {
    if (completed) return null;

    const date = new Date(due);
    const days = differenceInDays(date, new Date());

    if (isPast(date) && !isToday(date))
      return (
        <span className="px-4 py-2 bg-red-500/20 text-red-400 rounded-full text-sm font-bold">
          OVERDUE
        </span>
      );

    if (isToday(date))
      return (
        <span className="px-4 py-2 bg-orange-500/20 text-orange-400 rounded-full text-sm font-bold">
          DUE TODAY
        </span>
      );

    if (isTomorrow(date))
      return (
        <span className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-full text-sm font-bold">
          DUE TOMORROW
        </span>
      );

    if (days <= 7)
      return (
        <span className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-full text-sm font-bold">
          {days} DAYS LEFT
        </span>
      );

    return null;
  };

  const overdueCount = assignments.filter(
    (a) => !a.is_completed && isPast(new Date(a.due_date)) && !isToday(new Date(a.due_date))
  ).length;

  // -------------------------------------
  // UI (unchanged)
  // -------------------------------------
  return (
    <div className="fixed inset-0 bg-[#0d0d0f] text-white flex flex-col">
      {/* HEADER */}
      <div className="flex flex-row items-center p-4 sm:p-6 border-b border-white/10 bg-black/50 backdrop-blur-xl">
        <div className="flex items-center gap-4 sm:gap-6">
          <button
            onClick={() => router.push("/dashboard/student")}
            className="block sm:hidden p-2 hover:bg-white/10 rounded-xl"
          >
            <ArrowLeftIcon className="w-6 h-6" />
          </button>

          <div className="hidden sm:flex gap-4">
            {overdueCount > 0 && (
              <div className="px-3 sm:px-5 py-2 sm:py-3 bg-red-500/20 rounded-full border border-red-500/50">
                <span className="text-red-400 font-bold text-sm sm:text-base">{overdueCount} Overdue</span>
              </div>
            )}
          </div>
        </div>

        <h1 className="flex-1 text-center sm:text-left text-2xl sm:text-5xl font-bold leading-tight bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
          Assignments
        </h1>

        <div className="flex items-center gap-4 sm:gap-6">
          {!notificationsEnabled && (
            <button
              onClick={enableNotifications}
              className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-blue-500/20 border border-blue-500/50 rounded-full hover:bg-blue-500/30 transition text-sm sm:text-base"
            >
              <BellIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
              <span className="text-blue-400 font-semibold hidden sm:inline">Enable Reminders</span>
              <span className="text-blue-400 font-semibold sm:hidden">Reminders</span>
            </button>
          )}

          <button
            onClick={() => router.push("/dashboard/student")}
            className="hidden sm:block p-2 sm:p-3 hover:bg-white/10 rounded-xl"
          >
            <ArrowLeftIcon className="w-6 h-6 sm:w-7 sm:h-7" />
          </button>

          <button
            onClick={() => {
              setEditing(null);
              setForm({
                id: "",
                title: "",
                subject: "",
                due_date: "",
                description: "",
              });
              setShowModal(true);
            }}
            className="flex items-center gap-1 sm:gap-3 px-4 sm:px-8 py-2 sm:py-4 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full text-sm sm:text-lg font-bold hover:scale-105 transition shadow-2xl shadow-purple-500/50"
          >
            <PlusIcon className="w-5 h-5 sm:w-7 sm:h-7" /> <span className="hidden sm:inline">New Assignment</span><span className="sm:hidden">New</span>
          </button>
        </div>
      </div>

      {/* LIST */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-10">
        {assignments.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <CalendarIcon className="w-16 h-16 sm:w-28 sm:h-28 mx-auto mb-4 sm:mb-6 text-gray-600" />
              <p className="text-xl sm:text-3xl font-bold mb-2">No assignments yet</p>
              <p className="text-lg sm:text-xl text-gray-600">Create your first assignment to get started!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {assignments.map((a) => (
              <div
                key={a.id}
                className={`bg-white/5 backdrop-blur-xl border rounded-2xl sm:rounded-3xl p-4 sm:p-8 transition-all ${
                  a.is_completed
                    ? 'border-green-500/30 opacity-60'
                    : 'border-white/10 hover:border-pink-500/50'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4 sm:gap-6">
                  {/* Checkbox and Title row on mobile */}
                  <div className="flex items-center gap-4 sm:hidden">
                    <button
                      onClick={() => toggleComplete(a)}
                      className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                        a.is_completed
                          ? 'bg-green-500 border-green-500'
                          : 'border-white/30 hover:border-pink-500'
                      }`}
                    >
                      {a.is_completed && <CheckCircleIcon className="w-5 h-5 text-white" />}
                    </button>
                    <div className="flex items-center gap-2">
                      <h3 className={`text-xl font-bold ${a.is_completed ? 'line-through text-gray-500' : ''}`}>
                        {a.title}
                      </h3>
                      {getUrgencyBadge(a.due_date, a.is_completed)}
                    </div>
                  </div>

                  {/* Checkbox on desktop */}
                  <button
                    onClick={() => toggleComplete(a)}
                    className={`hidden sm:flex flex-shrink-0 w-10 h-10 rounded-full border-2 items-center justify-center transition-all ${
                      a.is_completed
                        ? 'bg-green-500 border-green-500'
                        : 'border-white/30 hover:border-pink-500'
                    }`}
                  >
                    {a.is_completed && <CheckCircleIcon className="w-6 h-6 text-white" />}
                  </button>

                  {/* Content */}
                  <div className="flex-1 w-full sm:w-auto">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2">
                      <h3 className={`hidden sm:block text-xl sm:text-3xl font-bold ${a.is_completed ? 'line-through text-gray-500' : ''}`}>
                        {a.title}
                      </h3>
                      <span className="hidden sm:block">
                        {getUrgencyBadge(a.due_date, a.is_completed)}
                      </span>
                    </div>

                    {a.subject && (
                      <p className="text-purple-400 text-base sm:text-lg mb-2">{a.subject}</p>
                    )}

                    <p className="text-gray-400 text-base sm:text-xl mb-2">
                      📅 Due: {format(new Date(a.due_date), "MMM dd, yyyy")}
                    </p>

                    {a.description && (
                      <p className="text-gray-500 text-sm sm:text-base mt-3">{a.description}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 sm:gap-3 self-end sm:self-auto">
                    <button
                      onClick={() => {
                        setEditing(a);
                        setForm({
                          id: a.id,
                          title: a.title,
                          subject: a.subject || "",
                          due_date: a.due_date,
                          description: a.description || "",
                        });
                        setShowModal(true);
                      }}
                      className="p-3 sm:p-4 bg-white/10 rounded-xl hover:bg-white/20 transition"
                    >
                      <PencilIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>

                    <button
                      onClick={() => deleteAssignment(a.id)}
                      className="p-3 sm:p-4 bg-red-500/20 rounded-xl hover:bg-red-500/40 transition"
                    >
                      <TrashIcon className="w-5 h-5 sm:w-6 sm:h-6 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xl flex items-center justify-center p-6 z-50">
          <div className="bg-[#1a1a1e] p-10 rounded-3xl border border-white/20 w-full max-w-xl">
            <h2 className="text-4xl font-bold mb-10 bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
              {editing ? "Edit Assignment" : "New Assignment"}
            </h2>

            <input
              type="text"
              value={form.title}
              placeholder="Assignment title"
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full mb-6 px-6 py-5 bg-white/10 border border-white/20 rounded-2xl focus:border-pink-500 focus:ring-2 focus:ring-pink-500/50 outline-none"
            />

            <input
              type="text"
              value={form.subject}
              placeholder="Subject (optional)"
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="w-full mb-6 px-6 py-5 bg-white/10 border border-white/20 rounded-2xl focus:border-pink-500 focus:ring-2 focus:ring-pink-500/50 outline-none"
            />

            <input
              type="date"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              className="w-full mb-6 px-6 py-5 bg-white/10 border border-white/20 rounded-2xl focus:border-pink-500 focus:ring-2 focus:ring-pink-500/50 outline-none"
            />

            <textarea
              value={form.description}
              placeholder="Description (optional)"
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full mb-8 px-6 py-5 bg-white/10 border border-white/20 rounded-2xl h-32 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/50 outline-none resize-none"
            />

            <div className="flex gap-4">
              <button
                onClick={saveAssignment}
                disabled={!form.title.trim() || !form.due_date}
                className="flex-1 py-5 bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl font-bold hover:scale-105 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editing ? "Save Changes" : "Create Assignment"}
              </button>

              <button
                onClick={() => setShowModal(false)}
                className="px-10 py-5 bg-white/10 rounded-2xl hover:bg-white/20 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}