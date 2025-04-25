import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { Button, Form, Input, InputNumber, Layout, Typography, Select, Space, message, Radio, Checkbox } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import http from '../../utils/request';

const { Header } = Layout;
const { Title } = Typography;
const { TextArea } = Input;

export default function QuestionEdit() {
    const params = useParams();
    const navigate = useNavigate();
    const [form] = Form.useForm();
    const [game, setGame] = useState(null);
    const [questionType, setQuestionType] = useState('single'); // 'single', 'multiple', 'boolean'
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchGameAndQuestion();
    }, [params.game_id, params.question_id]);

    const fetchGameAndQuestion = async () => {
        try {
            const response = await http.get('/admin/games');
            if (response && response.games) {
                const currentGame = response.games.find(g => String(g.id) === String(params.game_id));
                if (currentGame) {
                    setGame(currentGame);
                    if (params.question_id) {
                        const question = currentGame.questions?.find(q => String(q.id) === String(params.question_id));
                        if (question) {
                            setQuestionType(question.type);
                            form.setFieldsValue({
                                title: question.title,
                                description: question.description,
                                type: question.type,
                                time: question.time,
                                points: question.points,
                                options: question.options,
                                correctAnswers: question.correctAnswers
                            });
                        }
                    }
                } else {
                    message.error('Game does not exist');
                    navigate('/dashboard');
                }
            }
        } catch (error) {
            console.error('Failed to get game information:', error);
            message.error('Failed to get game information');
        }
    };

    const handleSubmit = async (values) => {
        try {
            setLoading(true);
            const response = await http.get('/admin/games');
            if (response && response.games) {
                const allGames = response.games;
                const currentGameIndex = allGames.findIndex(g => String(g.id) === String(params.game_id));
                
                if (currentGameIndex !== -1) {
                    const currentGame = allGames[currentGameIndex];
                    const questions = currentGame.questions || [];
                    
                    // Process correct answers
                    let correctAnswers = [];
                    if (questionType === 'boolean') {
                        correctAnswers = [values.correctAnswer];
                    } else if (values.options) {
                        correctAnswers = values.options
                            .filter(option => option.isCorrect)
                            .map(option => option.text);
                    }

                    const questionData = {
                        id: params.question_id || Date.now().toString(),
                        ...values,
                        type: questionType,
                        correctAnswers: correctAnswers
                    };

                    let updatedQuestions;
                    if (params.question_id) {
                        updatedQuestions = questions.map(q => 
                            String(q.id) === String(params.question_id) ? questionData : q
                        );
                    } else {
                        updatedQuestions = [...questions, questionData];
                    }

                    allGames[currentGameIndex] = {
                        ...currentGame,
                        questions: updatedQuestions,
                        updatedAt: new Date().toISOString()
                    };

                    const updateResponse = await http.put('/admin/games', { games: allGames });
                    if (updateResponse) {
                        message.success('Saved successfully');
                        navigate(`/game/${params.game_id}`);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to save:', error);
            message.error('Failed to save');
        } finally {
            setLoading(false);
        }
    };

    const typeOptions = [
        { label: 'Single Choice', value: 'single' },
        { label: 'Multiple Choice', value: 'multiple' },
        { label: 'True/False', value: 'boolean' }
    ];

    return (
        <Layout>
            <Header style={{ background: '#fff', padding: '0 20px' }}>
                <Title level={2}>{params.question_id ? 'Edit Question' : 'Create Question'}</Title>
            </Header>
            <div style={{ padding: '20px' }}>
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                    initialValues={{
                        type: 'single',
                        time: 30,
                        points: 10
                    }}
                >
                    <Form.Item
                        name="title"
                        label="Question Title"
                        rules={[{ required: true, message: 'Please enter question title' }]}
                    >
                        <Input placeholder="Enter question title" />
                    </Form.Item>

                    <Form.Item
                        name="description"
                        label="Question Description"
                        rules={[{ required: true, message: 'Please enter question description' }]}
                    >
                        <TextArea rows={4} placeholder="Enter question description" />
                    </Form.Item>

                    <Form.Item
                        name="type"
                        label="Question Type"
                        rules={[{ required: true, message: 'Please select question type' }]}
                    >
                        <Select
                            options={typeOptions}
                            onChange={(value) => setQuestionType(value)}
                        />
                    </Form.Item>

                    <Form.Item
                        name="time"
                        label="Time Limit (seconds)"
                        rules={[{ required: true, message: 'Please enter time limit' }]}
                    >
                        <InputNumber min={1} max={300} />
                    </Form.Item>

                    <Form.Item
                        name="points"
                        label="Points"
                        rules={[{ required: true, message: 'Please enter points' }]}
                    >
                        <InputNumber min={1} max={100} />
                    </Form.Item>

                    {questionType !== 'boolean' && (
                        <Form.List
                            name="options"
                            rules={[
                                {
                                    validator: async (_, options) => {
                                        if (!options || options.length < 2) {
                                            return Promise.reject(new Error('At least two options are required'));
                                        }
                                        if (questionType === 'single') {
                                            const correctCount = options.filter(opt => opt.isCorrect).length;
                                            if (correctCount > 1) {
                                                return Promise.reject(new Error('Single choice question can only have one correct answer'));
                                            }
                                            if (correctCount === 0) {
                                                return Promise.reject(new Error('Please select a correct answer'));
                                            }
                                        }
                                    },
                                },
                            ]}
                        >
                            {(fields, { add, remove }) => (
                                <>
                                    {fields.map(({ key, name, ...restField }) => (
                                        <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                                            <Form.Item
                                                {...restField}
                                                name={[name, 'text']}
                                                rules={[{ required: true, message: 'Please enter option content' }]}
                                            >
                                                <Input placeholder="Option content" />
                                            </Form.Item>
                                            <Form.Item
                                                {...restField}
                                                name={[name, 'isCorrect']}
                                                valuePropName="checked"
                                            >
                                                {questionType === 'single' ? (
                                                    <Checkbox
                                                        onChange={(e) => {
                                                            const checked = e.target.checked;
                                                            const currentOptions = form.getFieldValue('options');
                                                            const updatedOptions = currentOptions.map((opt, index) => ({
                                                                ...opt,
                                                                isCorrect: index === name ? checked : false
                                                            }));
                                                            form.setFieldsValue({ options: updatedOptions });
                                                        }}
                                                    />
                                                ) : (
                                                    <Checkbox />
                                                )}
                                            </Form.Item>
                                            <MinusCircleOutlined onClick={() => remove(name)} />
                                        </Space>
                                    ))}
                                    <Form.Item>
                                        <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                            Add Option
                                        </Button>
                                    </Form.Item>
                                </>
                            )}
                        </Form.List>
                    )}

                    {questionType === 'boolean' && (
                        <Form.Item
                            name="correctAnswer"
                            label="Correct Answer"
                            rules={[{ required: true, message: 'Please select correct answer' }]}
                        >
                            <Radio.Group>
                                <Radio value={true}>True</Radio>
                                <Radio value={false}>False</Radio>
                            </Radio.Group>
                        </Form.Item>
                    )}

                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading}>
                            Save
                        </Button>
                    </Form.Item>
                </Form>
            </div>
        </Layout>
    );
}