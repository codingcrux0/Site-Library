import { ArrowRight, type LucideProps } from "lucide-react";

// The hero asks for icons as functions, e.g. icons.arrowRight({ width: 15, height: 15 }).
// We hand it lucide-react icons. They are decorative, so screen readers skip them.
export const icons = {
  arrowRight: (props: LucideProps = {}) => (
    <ArrowRight aria-hidden="true" focusable="false" {...props} />
  ),
};
