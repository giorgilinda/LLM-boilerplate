import type { MessageKey } from "@/lib/i18n/messages";

/**
 * Issue categories offered for negative feedback. `value` is the stable,
 * machine-readable string sent to the API; `labelKey` is the translated label
 * shown in the dropdown.
 */
export const NEGATIVE_FEEDBACK_CATEGORIES: ReadonlyArray<{
  value: string;
  labelKey: MessageKey;
}> = [
  { value: "ui_bug", labelKey: "feedback.category.uiBug" },
  { value: "overcautious_refusal", labelKey: "feedback.category.overcautiousRefusal" },
  { value: "poor_image_understanding", labelKey: "feedback.category.poorImageUnderstanding" },
  { value: "didnt_follow_instructions", labelKey: "feedback.category.didntFollowInstructions" },
  { value: "factually_incorrect", labelKey: "feedback.category.factuallyIncorrect" },
  { value: "incomplete_response", labelKey: "feedback.category.incompleteResponse" },
  { value: "should_have_used_reasoning", labelKey: "feedback.category.shouldHaveUsedReasoning" },
  { value: "should_have_searched_web", labelKey: "feedback.category.shouldHaveSearchedWeb" },
  { value: "memory_issue", labelKey: "feedback.category.memoryIssue" },
  { value: "report_content", labelKey: "feedback.category.reportContent" },
];
