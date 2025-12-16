#[cfg(test)]
mod tests {
    use crate::models::prompt::{parse_markdown_prompt, MessageRole};

    #[test]
    fn test_parse_simple_markdown() {
        let content = r#"
# Test Prompt

## System Message
You are a helpful assistant.

## User Message
Hello {{name}}!
"#;

        let messages = parse_markdown_prompt(content).unwrap();
        assert_eq!(messages.len(), 2);
        
        assert!(matches!(messages[0].role, MessageRole::System));
        assert_eq!(messages[0].content.trim(), "You are a helpful assistant.");
        
        assert!(matches!(messages[1].role, MessageRole::User));
        assert!(messages[1].content.contains("Hello {{name}}!"));
    }

    #[test]
    fn test_parse_with_assistant() {
        let content = r#"
# Test Prompt

## System Message
You are helpful.

## User Message
Question: {{question}}

## Assistant Example
Here is an example answer.
"#;

        let messages = parse_markdown_prompt(content).unwrap();
        assert_eq!(messages.len(), 3);
        
        assert!(matches!(messages[0].role, MessageRole::System));
        assert!(matches!(messages[1].role, MessageRole::User));
        assert!(matches!(messages[2].role, MessageRole::Assistant));
    }

    #[test]
    fn test_parse_with_formatting() {
        let content = r#"
# Test Prompt

## System Message
You are a **helpful** assistant.

**Guidelines:**
- Be polite
- Be concise

## User Message
Customer: {{customer_name}}
Order: {{order_id}}

Generate a response.
"#;

        let messages = parse_markdown_prompt(content).unwrap();
        assert_eq!(messages.len(), 2);
        
        // Check that formatting is preserved
        assert!(messages[0].content.contains("**helpful**"));
        assert!(messages[0].content.contains("Guidelines:"));
        
        // Check variables
        assert!(messages[1].content.contains("{{customer_name}}"));
        assert!(messages[1].content.contains("{{order_id}}"));
    }

    #[test]
    fn test_parse_no_messages() {
        let content = r#"
# Test Prompt

Just some text without proper headings.
"#;

        let result = parse_markdown_prompt(content);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("No valid messages found"));
    }

    #[test]
    fn test_parse_only_h1() {
        let content = r#"
# Test Prompt

Some description text.
"#;

        let result = parse_markdown_prompt(content);
        assert!(result.is_err());
    }

    #[test]
    fn test_extract_variables() {
        use crate::models::prompt::PromptRuntime;
        
        let content = r#"
# Test

## System Message
You are helpful.

## User Message
Name: {{name}}
Age: {{age}}
City: {{city}}
Name again: {{name}}
"#;

        let messages = parse_markdown_prompt(content).unwrap();
        
        // Extract variables using regex
        let mut variables = Vec::new();
        let regex = regex::Regex::new(r"\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}").unwrap();

        for message in &messages {
            for cap in regex.captures_iter(&message.content) {
                let var_name = cap[1].to_string();
                if !variables.contains(&var_name) {
                    variables.push(var_name);
                }
            }
        }

        assert_eq!(variables.len(), 3);
        assert!(variables.contains(&"name".to_string()));
        assert!(variables.contains(&"age".to_string()));
        assert!(variables.contains(&"city".to_string()));
    }

    #[test]
    fn test_parse_multiline_content() {
        let content = r#"
# Test Prompt

## System Message

You are a professional customer service representative.

Your responsibilities include:
1. Answering questions
2. Resolving issues
3. Providing support

Always be polite and helpful.

## User Message

Customer Information:
- Name: {{customer_name}}
- Issue: {{issue_description}}

Please help them.
"#;

        let messages = parse_markdown_prompt(content).unwrap();
        assert_eq!(messages.len(), 2);
        
        // Check multiline content is preserved
        assert!(messages[0].content.contains("responsibilities"));
        assert!(messages[0].content.contains("Always be polite"));
        
        assert!(messages[1].content.contains("Customer Information"));
        assert!(messages[1].content.contains("Please help them"));
    }

    #[test]
    fn test_parse_code_blocks() {
        let content = r#"
# Test Prompt

## System Message

You are a code assistant.

Example format:
```
function hello() {
  return "world";
}
```

## User Message

Write code for {{task}}.
"#;

        let messages = parse_markdown_prompt(content).unwrap();
        assert_eq!(messages.len(), 2);
        
        // Code blocks should be preserved
        assert!(messages[0].content.contains("```"));
        assert!(messages[0].content.contains("function hello"));
    }

    #[test]
    fn test_case_insensitive_headings() {
        let content = r#"
# Test

## system message
lowercase system

## USER MESSAGE
uppercase user

## Assistant Example
mixed case
"#;

        let messages = parse_markdown_prompt(content).unwrap();
        assert_eq!(messages.len(), 3);
        
        assert!(matches!(messages[0].role, MessageRole::System));
        assert!(matches!(messages[1].role, MessageRole::User));
        assert!(matches!(messages[2].role, MessageRole::Assistant));
    }
}

